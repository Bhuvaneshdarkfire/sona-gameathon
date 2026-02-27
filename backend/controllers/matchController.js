// ─── Match Controller ───────────────────────────────────────────
// CRUD operations for matches (admin creates, updates with real scores).
// Supports CSV upload with ball-by-ball match data.

const { db, admin } = require('../config/firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Ensure match-data directory exists
const MATCH_DATA_DIR = path.join(__dirname, '..', 'match-data');
if (!fs.existsSync(MATCH_DATA_DIR)) fs.mkdirSync(MATCH_DATA_DIR, { recursive: true });

/**
 * POST /api/matches
 * Admin creates a new match entry.
 */
async function createMatch(req, res) {
    try {
        const { matchNumber, team1, team2, stadium, tossWinner, tossDecision } = req.body;

        if (!matchNumber || !team1 || !team2 || !stadium) {
            return res.status(400).json({
                error: 'Required: matchNumber, team1, team2, stadium',
            });
        }

        const matchRef = await db.collection('matches').add({
            matchNumber: Number(matchNumber),
            team1,
            team2,
            stadium,
            tossWinner: tossWinner || '',
            tossDecision: tossDecision || '',
            actualRunsInning1: null,
            actualRunsInning2: null,
            status: 'upcoming',
            evaluatedAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({
            message: 'Match created',
            matchId: matchRef.id,
        });
    } catch (err) {
        console.error('Create match error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * PUT /api/matches/:id
 * Admin updates match with actual scores and/or status.
 */
async function updateMatch(req, res) {
    try {
        const { id } = req.params;
        const updates = {};
        const allowed = ['team1', 'team2', 'stadium', 'tossWinner', 'tossDecision',
            'actualRunsInning1', 'actualRunsInning2', 'status'];

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                updates[key] = key.includes('actual') || key === 'matchNumber'
                    ? Number(req.body[key])
                    : req.body[key];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // If actual scores provided, mark as completed and invalidate old evaluation
        if (updates.actualRunsInning1 !== undefined && updates.actualRunsInning2 !== undefined) {
            updates.status = 'completed';
            updates.evaluatedAt = null; // Force re-evaluation

            // Delete stale predictions that used old actual scores
            const oldPreds = await db.collection('predictions')
                .where('matchId', '==', id)
                .get();
            if (!oldPreds.empty) {
                const batch = db.batch();
                oldPreds.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
                console.log(`🗑️  Deleted ${oldPreds.size} stale predictions for match ${id} (scores changed)`);
            }
        }

        await db.collection('matches').doc(id).update(updates);

        // Recalculate leaderboard if scores changed (predictions were removed)
        if (updates.actualRunsInning1 !== undefined || updates.actualRunsInning2 !== undefined) {
            const { updateLeaderboard } = require('../services/evaluationService');
            await updateLeaderboard();
        }

        res.json({ message: 'Match updated', matchId: id });
    } catch (err) {
        console.error('Update match error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/matches
 * List all matches, optionally filtered by status.
 */
async function listMatches(req, res) {
    try {
        const { status } = req.query;
        let q = db.collection('matches').orderBy('matchNumber', 'asc');
        if (status) {
            q = db.collection('matches')
                .where('status', '==', status)
                .orderBy('matchNumber', 'asc');
        }

        const snap = await q.get();
        const matches = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            evaluatedAt: doc.data().evaluatedAt?.toDate?.() || null,
        }));

        res.json({ matches });
    } catch (err) {
        console.error('List matches error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/matches/:id
 * Get a single match.
 */
async function getMatch(req, res) {
    try {
        const doc = await db.collection('matches').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Match not found' });
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { createMatch, updateMatch, listMatches, getMatch, uploadMatchCSV, getMatchData, getTeamPredictions };

/**
 * POST /api/matches/:id/csv
 * Admin uploads a CSV file with ball-by-ball match data.
 * The CSV is parsed into structured JSON and stored in Firestore.
 */
async function uploadMatchCSV(req, res) {
    try {
        const { id } = req.params;

        // Check match exists
        const matchDoc = await db.collection('matches').doc(id).get();
        if (!matchDoc.exists) return res.status(404).json({ error: 'Match not found' });

        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        // Save raw CSV to disk
        const csvPath = path.join(MATCH_DATA_DIR, `${id}.csv`);
        fs.writeFileSync(csvPath, req.file.buffer);

        // Parse CSV
        const rows = [];
        await new Promise((resolve, reject) => {
            const stream = require('stream');
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);

            bufferStream
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        if (rows.length === 0) {
            return res.status(400).json({ error: 'CSV is empty' });
        }

        // Build structured match data from ball-by-ball rows
        const matchData = parseCSVToMatchData(rows);

        // Store in Firestore — also invalidate old evaluation since input data changed
        await db.collection('matches').doc(id).update({
            matchData,
            csvUploaded: true,
            csvUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            evaluatedAt: null, // Force re-evaluation with new CSV data
            // Auto-fill match fields from CSV if not already set
            team1: matchData.innings1?.battingTeam || matchDoc.data().team1,
            team2: matchData.innings1?.bowlingTeam || matchDoc.data().team2,
            stadium: matchData.stadium || matchDoc.data().stadium,
            tossWinner: matchData.tossWinner || matchDoc.data().tossWinner,
            tossDecision: matchData.tossDecision || matchDoc.data().tossDecision,
        });

        // Delete old predictions (they used old CSV input data)
        const oldPreds = await db.collection('predictions')
            .where('matchId', '==', id)
            .get();
        if (!oldPreds.empty) {
            const delBatch = db.batch();
            oldPreds.docs.forEach(d => delBatch.delete(d.ref));
            await delBatch.commit();
            console.log(`🗑️  Deleted ${oldPreds.size} stale predictions for match ${id} (CSV re-uploaded)`);
        }

        console.log(`📄 CSV uploaded for match ${id}: ${rows.length} rows parsed`);

        res.json({
            message: `CSV parsed successfully: ${rows.length} innings records`,
            matchId: id,
            summary: {
                innings1: {
                    battingTeam: matchData.innings1?.battingTeam,
                    bowlingTeam: matchData.innings1?.bowlingTeam,
                    batsmen: matchData.innings1?.batsmen,
                    bowlers: matchData.innings1?.bowlers,
                },
                innings2: {
                    battingTeam: matchData.innings2?.battingTeam,
                    bowlingTeam: matchData.innings2?.bowlingTeam,
                    batsmen: matchData.innings2?.batsmen,
                    bowlers: matchData.innings2?.bowlers,
                },
            },
        });
    } catch (err) {
        console.error('Upload CSV error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Parse CSV rows into structured match data.
 * Supports the simplified per-innings summary format:
 *   venue, innings, batting_team, bowling_team, batsmen, bowlers, toss_winner, toss_decision
 * Where batsmen and bowlers are semicolon-separated lists.
 */
function parseCSVToMatchData(rows) {
    const innings1Rows = rows.filter(r => String(r.innings).trim() === '1');
    const innings2Rows = rows.filter(r => String(r.innings).trim() === '2');

    function buildInningsData(inningsRows) {
        if (inningsRows.length === 0) return null;

        const row = inningsRows[0]; // One row per innings in new format

        // Split semicolon-separated player lists (also support comma-separated fallback)
        const batsmenStr = (row.batsmen || row.batsman || '').trim();
        const bowlersStr = (row.bowlers || row.bowler || '').trim();
        const separator = batsmenStr.includes(';') ? ';' : ',';

        const batsmen = batsmenStr.split(separator).map(s => s.trim()).filter(Boolean);
        const bowlers = bowlersStr.split(separator).map(s => s.trim()).filter(Boolean);

        return {
            battingTeam: (row.batting_team || '').trim(),
            bowlingTeam: (row.bowling_team || '').trim(),
            batsmen,
            bowlers,
        };
    }

    const first = rows[0] || {};
    return {
        stadium: (first.venue || first.stadium || '').trim(),
        tossWinner: (first.toss_winner || '').trim(),
        tossDecision: (first.toss_decision || '').trim(),
        innings1: buildInningsData(innings1Rows),
        innings2: buildInningsData(innings2Rows),
    };
}

/**
 * GET /api/matches/:id/data
 * Returns parsed match data (from CSV) for a match.
 */
async function getMatchData(req, res) {
    try {
        const doc = await db.collection('matches').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Match not found' });

        const data = doc.data();
        if (!data.matchData) return res.json({ matchId: req.params.id, csvUploaded: false, matchData: null });

        res.json({
            matchId: req.params.id,
            csvUploaded: true,
            matchData: data.matchData,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/team-predictions/:teamId
 * Returns all predictions for a team across matches, with match details.
 */
async function getTeamPredictions(req, res) {
    try {
        const { teamId } = req.params;

        // Get all predictions for this team
        const predSnap = await db.collection('predictions')
            .where('teamId', '==', teamId)
            .get();

        if (predSnap.empty) return res.json({ predictions: [] });

        // Get all match IDs referenced
        const matchIds = [...new Set(predSnap.docs.map(d => d.data().matchId))];

        // Fetch match details
        const matchDocs = await Promise.all(
            matchIds.map(id => db.collection('matches').doc(id).get())
        );
        const matchMap = {};
        for (const md of matchDocs) {
            if (md.exists) {
                const d = md.data();
                matchMap[md.id] = {
                    matchNumber: d.matchNumber,
                    team1: d.team1,
                    team2: d.team2,
                    stadium: d.stadium,
                    actualScoreInning1: d.actualRunsInning1 ?? null,
                    actualScoreInning2: d.actualRunsInning2 ?? null,
                    status: d.status,
                };
            }
        }

        const predictions = predSnap.docs.map(d => {
            const pred = d.data();
            const match = matchMap[pred.matchId] || {};
            return {
                id: d.id,
                matchId: pred.matchId,
                matchNumber: match.matchNumber,
                team1: match.team1,
                team2: match.team2,
                stadium: match.stadium,
                predictedScoreInning1: pred.predictedRunsInning1 ?? null,
                predictedScoreInning2: pred.predictedRunsInning2 ?? null,
                actualScoreInning1: match.actualScoreInning1,
                actualScoreInning2: match.actualScoreInning2,
                errorInning1: pred.errorInning1 ?? null,
                errorInning2: pred.errorInning2 ?? null,
                totalError: pred.totalError ?? null,
                status: pred.success === false ? 'error' : 'success',
                evaluatedAt: pred.evaluatedAt?.toDate?.()?.toISOString() || null,
            };
        }).sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

        res.json({ predictions });
    } catch (err) {
        console.error('Get team predictions error:', err);
        res.status(500).json({ error: err.message });
    }
}

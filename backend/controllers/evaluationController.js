// ─── Evaluation Controller ──────────────────────────────────────
// Orchestrates running all team models against a match using the shared
// Docker base image and scoring predictions via CSV output.

const { db, admin } = require('../config/firebase-admin');
const dockerService = require('../services/dockerService');
const { calculateError, updateLeaderboard } = require('../services/evaluationService');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/evaluate/:matchId
 * Build test_file.csv from match data, run all team models, score predictions.
 */
async function evaluateMatch(req, res) {
    const { matchId } = req.params;

    try {
        // 1. Get match data
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matchDoc.data();

        // Check for actual scores
        const hasActualScores = (
            match.actualRunsInning1 !== null && match.actualRunsInning1 !== undefined &&
            match.actualRunsInning2 !== null && match.actualRunsInning2 !== undefined
        );
        if (!hasActualScores) {
            return res.status(400).json({
                error: 'Match does not have actual innings scores yet. Update the match with actual scores first.',
            });
        }

        // 2. Build test_file.csv from match data
        const testCsvPath = buildTestCSV(match, matchId);

        // 3. Get all active submissions
        const allSubsSnap = await db.collection('submissions')
            .where('active', '==', true)
            .get();

        const readyDocs = allSubsSnap.docs.filter(doc => doc.data().buildStatus === 'ready');

        if (readyDocs.length === 0) {
            // Cleanup test CSV
            try { fs.unlinkSync(testCsvPath); } catch { }
            return res.status(400).json({ error: 'No active submissions to evaluate' });
        }

        console.log(`\n🏏 Evaluating Match #${match.matchNumber}: ${match.team1} vs ${match.team2}`);
        console.log(`📊 Actual scores — I1: ${match.actualRunsInning1}, I2: ${match.actualRunsInning2}`);
        console.log(`🐳 Running ${readyDocs.length} team models...\n`);

        // Send immediate response (evaluation runs in background)
        res.status(202).json({
            message: `Evaluation started for ${readyDocs.length} teams. Check predictions for results.`,
            matchId,
            teamsCount: readyDocs.length,
        });

        // 4. Run each team's model sequentially
        const results = [];
        for (const subDoc of readyDocs) {
            const sub = subDoc.data();
            const teamLabel = `${sub.teamName || sub.teamId}`;

            console.log(`  🔄 Running model for team "${teamLabel}"...`);

            // Delete previous predictions for this team+match
            const existingPred = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            const oldPreds = existingPred.docs.filter(d => d.data().teamId === sub.teamId);
            if (oldPreds.length > 0) {
                const delBatch = db.batch();
                oldPreds.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
                console.log(`  🗑️  Removed ${oldPreds.length} old prediction(s) for "${teamLabel}"`);
            }

            // Run the container with shared base image
            const result = await dockerService.runPrediction(sub.teamId, testCsvPath);

            // Parse predictions from CSV output
            let predictedI1 = null;
            let predictedI2 = null;
            if (result.success && result.predictions.length > 0) {
                // Look for innings 1 and 2 predictions
                for (const pred of result.predictions) {
                    const id = String(pred.id).trim();
                    if (id === '1' || id.toLowerCase().includes('inning1') || id.toLowerCase().includes('innings1')) {
                        predictedI1 = pred.predicted_run;
                    } else if (id === '2' || id.toLowerCase().includes('inning2') || id.toLowerCase().includes('innings2')) {
                        predictedI2 = pred.predicted_run;
                    }
                }

                // Fallback: if only 2 predictions, treat as [innings1, innings2]
                if (predictedI1 === null && predictedI2 === null && result.predictions.length >= 2) {
                    predictedI1 = result.predictions[0].predicted_run;
                    predictedI2 = result.predictions[1].predicted_run;
                } else if (predictedI1 === null && result.predictions.length >= 1) {
                    predictedI1 = result.predictions[0].predicted_run;
                }
            }

            // Calculate error
            let error = { errorInning1: 0, errorInning2: 0, totalError: 0 };
            if (result.success && predictedI1 !== null && predictedI2 !== null) {
                error = calculateError(
                    predictedI1, predictedI2,
                    match.actualRunsInning1, match.actualRunsInning2
                );
                console.log(`  ✅ "${teamLabel}": Predicted [${predictedI1}, ${predictedI2}] vs Actual [${match.actualRunsInning1}, ${match.actualRunsInning2}] → Error: ${error.totalError}`);
            } else {
                console.log(`  ❌ "${teamLabel}" failed: ${result.error || 'Could not parse predictions'}`);
                error = { errorInning1: 999, errorInning2: 999, totalError: 1998 };
            }

            // Save prediction record
            await db.collection('predictions').add({
                matchId,
                teamId: sub.teamId,
                submissionId: subDoc.id,
                predictedRunsInning1: predictedI1,
                predictedRunsInning2: predictedI2,
                errorInning1: error.errorInning1,
                errorInning2: error.errorInning2,
                totalError: error.totalError,
                executionTimeMs: result.executionTimeMs,
                status: result.success ? 'success' : (result.error === 'TIMEOUT' ? 'timeout' : 'error'),
                containerLog: (result.log || '').slice(-2000),
                error: result.error,
                success: result.success,
                evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            results.push({
                teamId: sub.teamId,
                teamName: sub.teamName,
                ...error,
                status: result.success ? 'success' : 'error',
            });
        }

        // 5. Cleanup test CSV
        try { fs.unlinkSync(testCsvPath); } catch { }

        // 6. Update match status
        await db.collection('matches').doc(matchId).update({
            evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 7. Recalculate leaderboard
        await updateLeaderboard();

        console.log(`\n✅ Evaluation complete for Match #${match.matchNumber}. ${results.length} teams scored.\n`);
    } catch (err) {
        console.error('Evaluation error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: `Evaluation failed: ${err.message}` });
        }
    }
}

/**
 * Build test_file.csv from match data.
 * Format: id, venue, innings, batting_team, bowling_team, toss_winner, toss_decision
 *
 * Creates 2 rows — one per innings.
 */
function buildTestCSV(match, matchId) {
    const tmpDir = path.join(os.tmpdir(), `gameathon-test-${uuidv4().slice(0, 8)}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const csvPath = path.join(tmpDir, 'test_file.csv');

    const header = 'id,venue,innings,batting_team,bowling_team,toss_winner,toss_decision';

    // Build innings data from match and matchData
    const md = match.matchData || {};
    const i1 = md.innings1 || {};
    const i2 = md.innings2 || {};

    const row1 = [
        1,
        `"${(match.stadium || '').replace(/"/g, '""')}"`,
        1,
        `"${(i1.battingTeam || match.team1 || '').replace(/"/g, '""')}"`,
        `"${(i1.bowlingTeam || match.team2 || '').replace(/"/g, '""')}"`,
        `"${(match.tossWinner || '').replace(/"/g, '""')}"`,
        `"${(match.tossDecision || '').replace(/"/g, '""')}"`,
    ].join(',');

    const row2 = [
        2,
        `"${(match.stadium || '').replace(/"/g, '""')}"`,
        2,
        `"${(i2.battingTeam || match.team2 || '').replace(/"/g, '""')}"`,
        `"${(i2.bowlingTeam || match.team1 || '').replace(/"/g, '""')}"`,
        `"${(match.tossWinner || '').replace(/"/g, '""')}"`,
        `"${(match.tossDecision || '').replace(/"/g, '""')}"`,
    ].join(',');

    fs.writeFileSync(csvPath, `${header}\n${row1}\n${row2}\n`);
    return csvPath;
}

/**
 * GET /api/predictions/:matchId
 * Get all predictions for a specific match.
 */
async function getPredictions(req, res) {
    try {
        const { matchId } = req.params;
        const snap = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();

        const predictions = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            let teamName = data.teamName || '';
            if (!teamName && data.teamId) {
                const teamDoc = await db.collection('teams').doc(data.teamId).get();
                teamName = teamDoc.exists ? teamDoc.data().teamName : 'Unknown';
            }
            predictions.push({
                id: doc.id,
                ...data,
                teamName,
                evaluatedAt: data.evaluatedAt?.toDate?.() || null,
            });
        }

        predictions.sort((a, b) => (a.totalError || 0) - (b.totalError || 0));
        res.json({ predictions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { evaluateMatch, getPredictions };

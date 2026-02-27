// ─── Evaluation Cron Job ────────────────────────────────────────
// Periodically checks for completed matches that haven't been evaluated
// and triggers evaluation automatically.

const cron = require('node-cron');
const { db, admin } = require('../config/firebase-admin');
const dockerService = require('../services/dockerService');
const { calculateError, updateLeaderboard } = require('../services/evaluationService');

/**
 * Start the evaluation cron job.
 * Runs every hour by default, configurable via EVAL_CRON_SCHEDULE env var.
 */
function startEvaluationCron() {
    const schedule = process.env.EVAL_CRON_SCHEDULE || '0 * * * *'; // Every hour

    console.log(`⏰ Evaluation cron scheduled: "${schedule}"`);

    cron.schedule(schedule, async () => {
        console.log(`\n⏰ [${new Date().toISOString()}] Running scheduled evaluation check...`);

        try {
            // Find completed matches that haven't been evaluated
            const matchesSnap = await db.collection('matches')
                .where('status', '==', 'completed')
                .get();

            const unevaluated = [];
            for (const doc of matchesSnap.docs) {
                const data = doc.data();
                // Check if this match has predictions
                const predsSnap = await db.collection('predictions')
                    .where('matchId', '==', doc.id)
                    .limit(1)
                    .get();

                if ((predsSnap.empty || !data.evaluatedAt) && data.actualRunsInning1 !== null) {
                    unevaluated.push({ id: doc.id, ...data });
                }
            }

            if (unevaluated.length === 0) {
                console.log('  No unevaluated completed matches found.');
                return;
            }

            console.log(`  Found ${unevaluated.length} unevaluated match(es). Starting evaluation...`);

            // Get active submissions
            const allSubsSnap = await db.collection('submissions')
                .where('active', '==', true)
                .get();

            const readySubs = allSubsSnap.docs.filter(doc => doc.data().buildStatus === 'ready');

            if (readySubs.length === 0) {
                console.log('  No active submissions to evaluate.');
                return;
            }

            // Evaluate each match
            for (const match of unevaluated) {
                console.log(`\n  🏏 Auto-evaluating Match #${match.matchNumber}: ${match.team1} vs ${match.team2}`);

                const matchInput = {
                    matchNumber: match.matchNumber,
                    team1: match.team1,
                    team2: match.team2,
                    stadium: match.stadium,
                    tossWinner: match.tossWinner,
                    tossDecision: match.tossDecision,
                };

                for (const subDoc of readySubs) {
                    const sub = subDoc.data();

                    // Skip if already evaluated
                    const existingPreds = await db.collection('predictions')
                        .where('matchId', '==', match.id)
                        .get();

                    const alreadyDone = existingPreds.docs.some(d => d.data().teamId === sub.teamId);
                    if (alreadyDone) continue;

                    const result = await dockerService.runPrediction(sub.dockerImageTag, matchInput);

                    let error;
                    if (result.success) {
                        error = calculateError(
                            result.predictedRunsInning1,
                            result.predictedRunsInning2,
                            match.actualRunsInning1,
                            match.actualRunsInning2
                        );
                    } else {
                        error = { errorInning1: 999, errorInning2: 999, totalError: 1998 };
                    }

                    await db.collection('predictions').add({
                        matchId: match.id,
                        teamId: sub.teamId,
                        submissionId: subDoc.id,
                        predictedRunsInning1: result.predictedRunsInning1,
                        predictedRunsInning2: result.predictedRunsInning2,
                        errorInning1: error.errorInning1,
                        errorInning2: error.errorInning2,
                        totalError: error.totalError,
                        executionTimeMs: result.executionTimeMs,
                        status: result.success ? 'success' : 'error',
                        containerLog: result.log || '',
                        error: result.error,
                        evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }

                await db.collection('matches').doc(match.id).update({
                    evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // Update leaderboard
            await updateLeaderboard();
            console.log('  ✅ Scheduled evaluation complete.\n');
        } catch (err) {
            console.error('  ❌ Cron evaluation error:', err.message);
        }
    });
}

module.exports = { startEvaluationCron };

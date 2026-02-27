// ─── Evaluation Service ─────────────────────────────────────────
// Scoring logic and leaderboard update functions.

const { db } = require('../config/firebase-admin');

/**
 * Calculate prediction error for a single match.
 *
 * @param {number} predictedInning1 - Predicted runs after 1st over, inning 1
 * @param {number} predictedInning2 - Predicted runs after 1st over, inning 2
 * @param {number} actualInning1    - Actual runs
 * @param {number} actualInning2    - Actual runs
 * @returns {{ errorInning1, errorInning2, totalError }}
 */
function calculateError(predictedInning1, predictedInning2, actualInning1, actualInning2) {
    const errorInning1 = Math.abs(predictedInning1 - actualInning1);
    const errorInning2 = Math.abs(predictedInning2 - actualInning2);
    return {
        errorInning1,
        errorInning2,
        totalError: errorInning1 + errorInning2,
    };
}

/**
 * Recalculate and update the leaderboard.
 * Sums totalError from all predictions for each team.
 * Lower cumulative error = better rank.
 *
 * Updates the `cumulativeError` field on each team doc.
 */
async function updateLeaderboard() {
    // Get all predictions
    const predictionsSnap = await db.collection('predictions')
        .where('status', '==', 'success')
        .get();

    // Aggregate errors by teamId
    const teamErrors = {};
    const teamMatchCount = {};
    predictionsSnap.forEach((doc) => {
        const data = doc.data();
        if (!teamErrors[data.teamId]) {
            teamErrors[data.teamId] = 0;
            teamMatchCount[data.teamId] = 0;
        }
        teamErrors[data.teamId] += data.totalError || 0;
        teamMatchCount[data.teamId] += 1;
    });

    // Update each team's cumulative error and match count
    const batch = db.batch();
    for (const [teamId, error] of Object.entries(teamErrors)) {
        const ref = db.collection('teams').doc(teamId);
        batch.update(ref, {
            cumulativeError: error,
            matchesEvaluated: teamMatchCount[teamId],
            // Also store as "score" for backward compatibility with frontend
            // Frontend sorts descending, so we use negative error for compatibility
            // OR we update frontend to sort ascending — for now store raw error
            score: error,
        });
    }

    await batch.commit();
    console.log(`✅ Leaderboard updated for ${Object.keys(teamErrors).length} teams`);
    return teamErrors;
}

/**
 * Get the ranked leaderboard.
 * Returns teams sorted by cumulative error (ascending = best).
 */
async function getLeaderboard() {
    const snap = await db.collection('teams')
        .where('role', '==', 'user')
        .get();

    const teams = snap.docs
        .filter((doc) => doc.data().status === 'Approved')
        .map((doc) => ({
            id: doc.id,
            teamName: doc.data().teamName,
            institute: doc.data().institute,
            cumulativeError: doc.data().cumulativeError ?? 0,
            matchesEvaluated: doc.data().matchesEvaluated ?? 0,
            score: doc.data().score ?? 0,
        }));

    // Sort by cumulative error ascending (lowest error = rank 1)
    teams.sort((a, b) => a.cumulativeError - b.cumulativeError);

    // Add rank
    return teams.map((t, i) => ({ ...t, rank: i + 1 }));
}

module.exports = {
    calculateError,
    updateLeaderboard,
    getLeaderboard,
};

// ─── Leaderboard Controller ─────────────────────────────────────

const { getLeaderboard } = require('../services/evaluationService');
const dockerService = require('../services/dockerService');

/**
 * GET /api/leaderboard
 */
async function leaderboard(req, res) {
    try {
        const ranked = await getLeaderboard();
        res.json({ leaderboard: ranked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/health
 * System health check including Docker status.
 */
async function healthCheck(req, res) {
    const dockerStatus = await dockerService.pingDocker();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        docker: dockerStatus,
    });
}

module.exports = { leaderboard, healthCheck };

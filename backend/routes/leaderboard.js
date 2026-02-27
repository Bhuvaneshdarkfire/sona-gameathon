// ─── Leaderboard Routes ─────────────────────────────────────────
const express = require('express');
const { leaderboard, healthCheck } = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/', leaderboard);
router.get('/health', healthCheck);

module.exports = router;

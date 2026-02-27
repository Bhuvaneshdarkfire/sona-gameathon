// ─── Match Routes ───────────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const { verifyAdmin } = require('../middleware/authMiddleware');
const {
    createMatch,
    updateMatch,
    listMatches,
    getMatch,
    uploadMatchCSV,
    getMatchData,
    getTeamPredictions,
} = require('../controllers/matchController');
const { evaluateMatch, getPredictions } = require('../controllers/evaluationController');

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Match CRUD (admin only)
router.post('/', verifyAdmin, createMatch);
router.put('/:id', verifyAdmin, updateMatch);
router.get('/', listMatches);            // Public: list all matches
router.get('/:id', getMatch);           // Public: get single match

// CSV upload (admin only)
router.post('/:id/csv', verifyAdmin, csvUpload.single('file'), uploadMatchCSV);
router.get('/:id/data', getMatchData);  // Public: get parsed CSV data

// Evaluation trigger (admin only)
router.post('/evaluate/:matchId', verifyAdmin, evaluateMatch);

// Predictions for a match (public)
router.get('/predictions/:matchId', getPredictions);

module.exports = router;

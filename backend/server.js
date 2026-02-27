// ─── Gameathon Backend Server ────────────────────────────────────
// Express server with Docker-based ML model evaluation system.
//
// API Routes:
//   POST   /api/submissions/upload       — Upload .zip model submission
//   GET    /api/submissions/:teamId      — Team's submission history
//   GET    /api/submissions/status/:id   — Check build status
//   POST   /api/matches                  — Create match (admin)
//   PUT    /api/matches/:id              — Update match scores (admin)
//   GET    /api/matches                  — List all matches
//   POST   /api/matches/evaluate/:matchId — Trigger evaluation (admin)
//   GET    /api/matches/predictions/:matchId — Get predictions
//   GET    /api/leaderboard              — Ranked leaderboard
//   GET    /api/leaderboard/health       — System health check
//   POST   /api/send-credentials         — Send email credentials

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Mount API Routes ─────────────────────────────────────────
const submissionRoutes = require('./routes/submissions');
const matchRoutes = require('./routes/matches');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/api/submissions', submissionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Team predictions (standalone route)
const { getTeamPredictions } = require('./controllers/matchController');
app.get('/api/team-predictions/:teamId', getTeamPredictions);

// ─── Start Evaluation Cron ────────────────────────────────────
const { startEvaluationCron } = require('./jobs/evaluationCron');
startEvaluationCron();

// ─── Legacy: Email Credentials Endpoint ───────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.post('/api/send-credentials', async (req, res) => {
  const { to, teamName, email, password } = req.body;
  if (!to || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: to, email, password' });
  }

  try {
    await transporter.sendMail({
      from: `"Sona Gameathon" <${process.env.EMAIL_USER}>`,
      to,
      subject: '🏏 Sona Gameathon — Your Login Credentials',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏏 Sona Gameathon</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Season 2026</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #e2e8f0; margin: 0 0 8px;">Welcome, ${teamName || 'Team'}!</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Your team has been <span style="color: #4ade80; font-weight: bold;">approved</span>. Here are your login credentials:
            </p>
            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</span>
                <div style="color: #f1f5f9; font-family: monospace; font-size: 16px; margin-top: 4px;">${email}</div>
              </div>
              <div>
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Password</span>
                <div style="color: #60a5fa; font-family: monospace; font-size: 16px; margin-top: 4px;">${password}</div>
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">
              Login at: <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="color: #60a5fa;">${process.env.APP_URL || 'http://localhost:5173'}/login</a>
            </p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
              Please change your password after first login. Good luck! 🎯
            </p>
          </div>
        </div>
      `
    });
    res.json({ success: true, message: 'Email sent!' });
  } catch (e) {
    console.error('Email error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Error Handling Middleware ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max 5MB.' });
  }
  if (err.message === 'Only .zip files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🏏 Gameathon Backend Server                         ║
║  Port: ${PORT}                                          ║
║                                                       ║
║  API Routes:                                          ║
║   POST   /api/submissions/upload                      ║
║   GET    /api/submissions/:teamId                     ║
║   POST   /api/matches                                 ║
║   PUT    /api/matches/:id                             ║
║   GET    /api/matches                                 ║
║   POST   /api/matches/evaluate/:matchId               ║
║   POST   /api/matches/:id/csv                         ║
║   GET    /api/matches/:id/data                        ║
║   GET    /api/matches/predictions/:matchId            ║
║   GET    /api/team-predictions/:teamId                ║
║   GET    /api/leaderboard                             ║
║   GET    /api/leaderboard/health                      ║
║   POST   /api/send-credentials                        ║
╚═══════════════════════════════════════════════════════╝
    `);
});
// ─── Auth Middleware ────────────────────────────────────────────
// Verifies Firebase ID tokens on protected routes.
// Attaches decoded token and team info to req.

const { admin, db } = require('../config/firebase-admin');

/**
 * Verify Firebase Auth token from Authorization header.
 * Attaches `req.user` with { uid, email }.
 */
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = { uid: decoded.uid, email: decoded.email };
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Verify token AND check that user is an admin.
 */
async function verifyAdmin(req, res, next) {
    // First verify the token
    await verifyToken(req, res, async () => {
        try {
            // Look up team doc by UID to check role
            const snap = await db.collection('teams')
                .where('uid', '==', req.user.uid)
                .limit(1)
                .get();

            if (snap.empty) {
                return res.status(403).json({ error: 'Team not found' });
            }

            const team = snap.docs[0].data();
            if (team.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }

            req.teamDoc = { id: snap.docs[0].id, ...team };
            next();
        } catch (err) {
            console.error('Admin check failed:', err.message);
            return res.status(500).json({ error: 'Authorization check failed' });
        }
    });
}

/**
 * Verify token AND attach team document to request.
 */
async function verifyTeamMember(req, res, next) {
    await verifyToken(req, res, async () => {
        try {
            const snap = await db.collection('teams')
                .where('uid', '==', req.user.uid)
                .limit(1)
                .get();

            if (snap.empty) {
                return res.status(403).json({ error: 'Team not found for this user' });
            }

            req.teamDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
            next();
        } catch (err) {
            console.error('Team lookup failed:', err.message);
            return res.status(500).json({ error: 'Team lookup failed' });
        }
    });
}

module.exports = { verifyToken, verifyAdmin, verifyTeamMember };

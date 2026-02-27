// ─── Submission Controller ──────────────────────────────────────
// Handles .zip upload containing mymodelfile.py, validates and stores it.
// No Docker build needed — uses shared base image for evaluation.

const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase-admin');
const { admin } = require('../config/firebase-admin');

const MODELS_DIR = path.join(__dirname, '..', 'uploads', 'models');
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

/**
 * POST /api/submissions/upload
 * Accept a .zip file containing mymodelfile.py.
 * Validates, extracts, and stores the model file.
 */
async function uploadSubmission(req, res) {
    const teamId = req.teamDoc.id;
    const teamName = req.teamDoc.teamName || 'unknown';

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Send a .zip file containing mymodelfile.py.' });
    }

    const zipPath = req.file.path;
    const submissionId = uuidv4().slice(0, 12);

    try {
        // 1. Validate zip file
        let zip;
        try {
            zip = new AdmZip(zipPath);
        } catch {
            return res.status(400).json({ error: 'Invalid zip file.' });
        }

        // 2. Validate contents — must contain mymodelfile.py
        const entries = zip.getEntries();
        const modelEntry = entries.find(e => {
            const name = e.entryName.split('/').pop(); // Handle nested folders
            return name === 'mymodelfile.py' && !e.isDirectory;
        });

        if (!modelEntry) {
            return res.status(400).json({
                error: 'Zip must contain a file named "mymodelfile.py". No other name is accepted.',
            });
        }

        // 3. Extract mymodelfile.py content
        const modelContent = modelEntry.getData().toString('utf-8');

        // 4. Basic validation — must define MyModel class
        if (!modelContent.includes('class MyModel')) {
            return res.status(400).json({
                error: 'mymodelfile.py must define a class named "MyModel" with __init__(), fit(), and predict() methods.',
            });
        }

        // 5. Store the model file
        const teamDir = path.join(MODELS_DIR, teamId);
        if (!fs.existsSync(teamDir)) fs.mkdirSync(teamDir, { recursive: true });

        const modelPath = path.join(teamDir, 'mymodelfile.py');
        fs.writeFileSync(modelPath, modelContent, 'utf-8');

        // 6. Create submission record — immediately ready (no Docker build)
        const submissionRef = await db.collection('submissions').add({
            teamId,
            teamUid: req.user.uid,
            teamName,
            modelPath: `models/${teamId}/mymodelfile.py`,
            buildStatus: 'ready',  // No build step needed
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true,
            fileSize: modelContent.length,
        });

        // 7. Mark previous submissions as inactive
        const prevSnap = await db.collection('submissions')
            .where('teamId', '==', teamId)
            .get();

        const batch = db.batch();
        prevSnap.forEach((doc) => {
            if (doc.id !== submissionRef.id && doc.data().active === true) {
                batch.update(doc.ref, { active: false });
            }
        });
        await batch.commit();

        console.log(`✅ Model uploaded for team "${teamName}" (${teamId}) — ${modelContent.length} bytes`);

        res.status(201).json({
            message: 'Model uploaded successfully! Your mymodelfile.py is ready for evaluation.',
            submissionId: submissionRef.id,
            status: 'ready',
        });
    } catch (err) {
        console.error('Upload error:', err);
        if (!res.headersSent) {
            return res.status(500).json({ error: `Upload failed: ${err.message}` });
        }
    } finally {
        // Cleanup uploaded zip
        try { fs.unlinkSync(zipPath); } catch { /* ignore */ }
    }
}

/**
 * GET /api/submissions/:teamId
 * Get submission history for a team.
 */
async function getSubmissions(req, res) {
    try {
        const { teamId } = req.params;
        const snap = await db.collection('submissions')
            .where('teamId', '==', teamId)
            .get();

        const submissions = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || null,
        }))
            .sort((a, b) => {
                if (!a.submittedAt) return 1;
                if (!b.submittedAt) return -1;
                return new Date(b.submittedAt) - new Date(a.submittedAt);
            })
            .slice(0, 10);

        res.json({ submissions });
    } catch (err) {
        console.error('Get submissions error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/submissions/status/:submissionId
 * Check status of a specific submission.
 */
async function getSubmissionStatus(req, res) {
    try {
        const { submissionId } = req.params;
        const doc = await db.collection('submissions').doc(submissionId).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const data = doc.data();
        res.json({
            id: doc.id,
            buildStatus: data.buildStatus,
            modelPath: data.modelPath,
            active: data.active,
            fileSize: data.fileSize,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { uploadSubmission, getSubmissions, getSubmissionStatus };

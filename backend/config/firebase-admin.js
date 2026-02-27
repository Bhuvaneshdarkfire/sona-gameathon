// ─── Firebase Admin SDK Initialization ─────────────────────────
// Uses service account key for server-side Firestore access.
// Generate from: Firebase Console → Project Settings → Service Accounts

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

// If key file exists, use it; otherwise try env var
if (fs.existsSync(keyPath)) {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} else {
    console.warn('⚠️  No Firebase service account key found!');
    console.warn('   Place serviceAccountKey.json in backend/ or set FIREBASE_SERVICE_ACCOUNT env var.');
    // Initialize without credentials (will fail on Firestore calls)
    admin.initializeApp();
}

const db = admin.firestore();

module.exports = { admin, db };

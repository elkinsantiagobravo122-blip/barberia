const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const projectId = process.env.FIREBASE_PROJECT_ID || 'TU_PROJECT_ID';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (require('fs').existsSync(resolvedPath)) {
      const serviceAccount = require(resolvedPath);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    } else {
      admin.initializeApp({ projectId });
    }
  } else if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else {
    admin.initializeApp({
      projectId,
    });
  }
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
};

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const projectId = process.env.FIREBASE_PROJECT_ID || 'TU_PROJECT_ID';

if (!admin.apps.length) {
  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (require('fs').existsSync(resolvedPath)) {
      const serviceAccount = require(resolvedPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      admin.initializeApp({ projectId });
    }
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

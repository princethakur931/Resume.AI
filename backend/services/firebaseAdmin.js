const admin = require('firebase-admin');

function normalizePrivateKey(value = '') {
  if (!value) return value;

  let normalized = String(value).trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  return normalized.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
}

function buildServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (parsed.private_key) {
        parsed.private_key = normalizePrivateKey(parsed.private_key);
      }
      return parsed;
    } catch {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON value');
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    };
  }

  return null;
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const serviceAccount = buildServiceAccount();
  if (!serviceAccount) {
    throw new Error('Firebase admin credentials are missing');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return admin;
  } catch (err) {
    throw new Error(`Firebase admin credentials error: ${err.message}`);
  }
}

module.exports = { getFirebaseAdmin };

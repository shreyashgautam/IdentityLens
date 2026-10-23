import admin from 'firebase-admin';
import { env } from './env.js';

/**
 * Firebase Admin SDK Configuration
 * Conforms to Milestone 6 Phase 1 Architecture
 * 
 * Provides server-side Firebase ID token verification and user record lookup.
 * Supports deterministic mocking for unit and integration testing.
 */

let isInitialized = false;

export const initializeFirebase = () => {
  if (isInitialized || admin.apps.length > 0) {
    return admin.app();
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
      // Properly restore escaped newlines in RSA private key
      const formattedPrivateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedPrivateKey
        })
      });

      isInitialized = true;
      return admin.app();
    } catch (err) {
      console.error('[Firebase Admin Init Error] Failed to initialize Firebase:', err.message);
      return null;
    }
  }

  return null;
};

// Initialize once if environment variables are provided
initializeFirebase();

// Mock / Custom verifier hook for automated tests
let customTokenVerifier = null;

export const setCustomTokenVerifier = (verifierFn) => {
  customTokenVerifier = verifierFn;
};

export const resetCustomTokenVerifier = () => {
  customTokenVerifier = null;
};

/**
 * Verify Firebase ID token and retrieve authoritative user record
 * 
 * @param {string} idToken - Client-provided raw Firebase ID token
 * @returns {Promise<{ uid: string, email: string|null, emailVerified: boolean, provider: string, tokensValidAfterTime: string|null }>}
 */
export const verifyFirebaseIdToken = async (idToken) => {
  if (customTokenVerifier) {
    return await customTokenVerifier(idToken);
  }

  if (admin.apps.length === 0) {
    const error = new Error('Firebase Admin SDK is not configured on this server.');
    error.status = 500;
    error.code = 'FIREBASE_NOT_CONFIGURED';
    throw error;
  }

  try {
    // 1. Cryptographically verify signature and revocation status
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    // 2. Fetch authoritative user record to obtain tokensValidAfterTime and provider details
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    const providerId = decodedToken.firebase?.sign_in_provider || 'password';
    const email = userRecord.email || decodedToken.email || null;
    const emailVerified = Boolean(userRecord.emailVerified ?? decodedToken.email_verified);
    const tokensValidAfterTime = userRecord.tokensValidAfterTime || null;

    return {
      uid: decodedToken.uid,
      email,
      emailVerified,
      provider: providerId,
      tokensValidAfterTime
    };
  } catch (err) {
    const error = new Error(err.message || 'Invalid or expired Firebase ID token.');
    error.status = 401;
    error.code = 'INVALID_FIREBASE_TOKEN';
    throw error;
  }
};

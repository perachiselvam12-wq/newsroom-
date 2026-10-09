import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const resolvedProjectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID ||
  rawConfig.projectId ||
  'newsroom-ai-2b07a';

// Ensure authDomain always matches the active projectId unless explicitly customized
const rawAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain;
const resolvedAuthDomain =
  rawAuthDomain && !rawAuthDomain.includes('gen-lang-client')
    ? rawAuthDomain
    : `${resolvedProjectId}.firebaseapp.com`;

const resolvedStorageBucket =
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
  (rawConfig.storageBucket && !rawConfig.storageBucket.includes('gen-lang-client')
    ? rawConfig.storageBucket
    : `${resolvedProjectId}.firebasestorage.app`);

export const firebaseConfig = {
  projectId: resolvedProjectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey,
  authDomain: resolvedAuthDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId || '(default)',
  storageBucket: resolvedStorageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId,
};

// Log non-sensitive initialization config in development / console
if (typeof window !== 'undefined') {
  console.log('[Firebase Init]', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    currentHost: window.location.hostname,
    currentOrigin: window.location.origin,
  });
}

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with the provisioned database ID or default
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Initialize Firebase Auth singleton
export const auth = getAuth(app);

// Diagnostic helper function to inspect active Firebase config without leaking API secrets
export function getFirebaseDiagnostics() {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    currentHostname,
    currentOrigin,
    isVercelDeployment: currentHostname.includes('vercel.app'),
    expectedAuthorizedDomain: currentHostname,
  };
}

// Startup connection verification test as required by skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection to Firestore successfully verified.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Structured Firestore error handler conforming to skill specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

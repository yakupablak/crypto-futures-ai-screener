import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const root = process.cwd();
for (const envPath of [
  path.join(root, 'apps', 'web', '.env.local'),
  path.join(root, 'apps', 'functions', '.env.local'),
]) {
  if (fs.existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

function resolveServiceAccountPath() {
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!explicit) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH bulunamadi.');
  }

  return path.isAbsolute(explicit) ? explicit : path.resolve(root, explicit);
}

const serviceAccountPath = resolveServiceAccountPath();
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

const uid = process.env.APP_OWNER_UID ?? 'local-owner';
const username = process.env.BOOTSTRAP_USERNAME ?? 'yakup.trader.admin';
const password = process.env.BOOTSTRAP_PASSWORD ?? `Ctypto!${randomBytes(8).toString('hex')}`;
const email = `${username}@ctypto.app`;
const salt = randomBytes(16).toString('hex');
const passwordHash = scryptSync(password, salt, 64).toString('hex');
const now = new Date().toISOString();

let firebaseAuthStatus = 'skipped';
try {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      displayName: username,
      emailVerified: true,
      disabled: false,
    });
    firebaseAuthStatus = 'updated';
  } catch {
    await auth.createUser({
      uid,
      email,
      password,
      displayName: username,
      emailVerified: true,
      disabled: false,
    });
    firebaseAuthStatus = 'created';
  }
} catch (error) {
  firebaseAuthStatus = error?.errorInfo?.code ?? error?.message ?? 'failed';
}

await db.collection('users').doc(uid).set({
  uid,
  username,
  email,
  passwordSalt: salt,
  passwordHash,
  role: 'OWNER',
  createdAt: now,
  updatedAt: now,
}, { merge: true });

console.log(JSON.stringify({ uid, username, email, password, firebaseAuthStatus }, null, 2));

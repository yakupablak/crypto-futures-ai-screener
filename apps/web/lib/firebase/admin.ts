import fs from "node:fs";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getFirebaseServiceAccountPath, hasFirebaseAdminConfig } from "@/lib/env";

function getCredentialFromServiceAccountFile() {
  const serviceAccountPath = getFirebaseServiceAccountPath();
  if (!serviceAccountPath) {
    return null;
  }

  const raw = fs.readFileSync(serviceAccountPath, "utf8");
  const parsed = JSON.parse(raw) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    return null;
  }

  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  });
}

export function getAdminApp() {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const fileCredential = getCredentialFromServiceAccountFile();
  return (
    getApps()[0] ??
    initializeApp(
      fileCredential
        ? {
            credential: fileCredential,
          }
        : {
            credential: cert({
              projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
          },
    )
  );
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) {
    return null;
  }
  return getFirestore(app);
}

export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) {
    return null;
  }

  return getAuth(app);
}

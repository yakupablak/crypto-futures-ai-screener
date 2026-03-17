import fs from "node:fs";
import path from "node:path";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function resolvePath(candidate: string) {
  if (path.isAbsolute(candidate) && fs.existsSync(candidate)) {
    return candidate;
  }

  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
  ];

  for (const root of roots) {
    const resolved = path.resolve(root, candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

function getServiceAccountPath() {
  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (explicitPath) {
    return resolvePath(explicitPath);
  }

  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) {
      continue;
    }

    const found = fs
      .readdirSync(root)
      .find((file) => /firebase-adminsdk.*\.json$/i.test(file));

    if (found) {
      return path.join(root, found);
    }
  }

  return null;
}

function getCredential() {
  const serviceAccountPath = getServiceAccountPath();
  if (serviceAccountPath) {
    const parsed = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      });
    }
  }

  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  return undefined;
}

export function getDb() {
  const credential = getCredential();
  const app =
    getApps()[0] ??
    initializeApp(
      credential
        ? {
            credential,
          }
        : undefined,
    );

  return getFirestore(app);
}

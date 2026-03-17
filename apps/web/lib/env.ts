import fs from "node:fs";
import path from "node:path";

export const env = {
  enableMockData: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== "false",
  firebaseProjectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_ADMIN_PROJECT_ID,
  appOwnerId: process.env.APP_OWNER_UID ?? "local-owner",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
  geminiFastModel: process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash-lite",
};

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

export function getFirebaseServiceAccountPath() {
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

export function hasFirebaseAdminConfig() {
  return Boolean(
    getFirebaseServiceAccountPath() ||
      (process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  );
}

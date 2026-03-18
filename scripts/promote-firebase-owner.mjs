import fs from "node:fs";
import path from "node:path";

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const targetEmail = process.argv[2];

if (!targetEmail) {
  throw new Error("Kullanim: node scripts/promote-firebase-owner.mjs <email>");
}

const rootDir = process.cwd();
const serviceAccountPath = path.join(
  rootDir,
  "ctypto-8399b-firebase-adminsdk-fbsvc-73a3f70f20.json",
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error("Firebase service account dosyasi bulunamadi.");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

function parseEnv(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    result[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
  }

  return result;
}

function stringifyEnv(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

async function main() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });

  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await auth.getUserByEmail(targetEmail);
  const newOwnerId = user.uid;

  const envFiles = [
    path.join(rootDir, "apps", "web", ".env.local"),
    path.join(rootDir, "apps", "functions", ".env.local"),
  ];

  let oldOwnerId = null;
  for (const file of envFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }

    const parsed = parseEnv(fs.readFileSync(file, "utf8"));
    oldOwnerId ??= parsed.APP_OWNER_UID ?? null;
    parsed.APP_OWNER_UID = newOwnerId;
    fs.writeFileSync(file, stringifyEnv(parsed));
  }

  if (!oldOwnerId) {
    oldOwnerId = "local-owner";
  }

  const collections = [
    "settings",
    "marketUniverse",
    "scanRuns",
    "marketState",
    "signalCandidates",
    "signals",
    "trades",
    "tradeEvents",
    "indicatorCatalog",
    "indicatorProposals",
    "aiReviews",
    "modelUsageLogs",
  ];

  const stats = {};

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    let updated = 0;
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.ownerId === oldOwnerId) {
        batch.update(doc.ref, { ownerId: newOwnerId });
        updated += 1;
      }
    });

    if (updated > 0) {
      await batch.commit();
    }

    stats[collectionName] = updated;
  }

  await db.collection("users").doc(newOwnerId).set(
    {
      uid: newOwnerId,
      username: user.displayName?.trim() || targetEmail.split("@")[0].toLowerCase(),
      email: targetEmail.toLowerCase(),
      provider: "firebase-auth",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const sessionsSnapshot = await db.collection("authSessions").get();
  if (!sessionsSnapshot.empty) {
    const batch = db.batch();
    sessionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        promotedEmail: targetEmail.toLowerCase(),
        oldOwnerId,
        newOwnerId,
        migratedCollections: stats,
        clearedSessions: sessionsSnapshot.size,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

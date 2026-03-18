import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const serviceAccountPath = path.join(
  rootDir,
  "ctypto-8399b-firebase-adminsdk-fbsvc-73a3f70f20.json",
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error("Firebase service account dosyasi bulunamadi.");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

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

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

function stringifyEnv(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

async function getAccessToken() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`,
    }),
  });

  const payloadJson = await response.json();
  if (!response.ok) {
    throw new Error(`Access token alinmadi: ${JSON.stringify(payloadJson)}`);
  }

  return payloadJson.access_token;
}

async function ensureWebAppConfig() {
  const accessToken = await getAccessToken();
  const projectId = serviceAccount.project_id;
  const baseUrl = `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`;

  const listResponse = await fetch(baseUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const listPayload = await listResponse.json();
  if (!listResponse.ok) {
    throw new Error(`Web app listesi alinamadi: ${JSON.stringify(listPayload)}`);
  }

  const existingApp = listPayload.apps?.[0];
  let appName = existingApp?.name;

  if (!appName) {
    const createResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: "Crypto Futures Web",
      }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(`Web app olusturulamadi: ${JSON.stringify(createPayload)}`);
    }

    const operationName = createPayload.name;
    let done = false;
    let attempts = 0;
    while (!done && attempts < 20) {
      attempts += 1;
      const operationResponse = await fetch(
        `https://firebase.googleapis.com/v1beta1/${operationName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const operationPayload = await operationResponse.json();
      if (!operationResponse.ok) {
        throw new Error(`Web app operasyonu okunamadi: ${JSON.stringify(operationPayload)}`);
      }

      done = Boolean(operationPayload.done);
      if (done) {
        appName = operationPayload.response?.name;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  if (!appName) {
    throw new Error("Firebase web app adi elde edilemedi.");
  }

  const configResponse = await fetch(`https://firebase.googleapis.com/v1beta1/${appName}/config`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const configPayload = await configResponse.json();
  if (!configResponse.ok) {
    throw new Error(`Firebase web config alinamadi: ${JSON.stringify(configPayload)}`);
  }

  return configPayload;
}

async function main() {
  const config = await ensureWebAppConfig();
  const webEnvPath = path.join(rootDir, "apps", "web", ".env.local");
  const webEnv = fs.existsSync(webEnvPath) ? parseEnv(fs.readFileSync(webEnvPath, "utf8")) : {};

  const nextValues = {
    ...webEnv,
    NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
  };

  if (config.measurementId) {
    nextValues.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = config.measurementId;
  }

  fs.writeFileSync(webEnvPath, stringifyEnv(nextValues));

  console.log(
    JSON.stringify(
      {
        synced: true,
        webEnvPath,
        projectId: config.projectId,
        authDomain: config.authDomain,
        appId: config.appId,
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

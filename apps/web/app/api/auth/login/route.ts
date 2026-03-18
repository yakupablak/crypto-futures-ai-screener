import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteLogger } from "@/lib/api-logging";
import { FirebasePasswordAuthError, signInWithFirebaseEmailPassword } from "@/lib/auth/firebase-auth";
import { createSessionToken, normalizeUsername, verifyPassword } from "@/lib/auth/shared";
import { setSessionCookie } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const schema = z.object({
  username: z.string().trim().min(3),
  password: z.string().min(6),
});

type UserCredentialRecord = {
  uid: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
};

async function createAppSession(input: {
  uid: string;
  username: string;
  email?: string;
}) {
  const db = getAdminDb();
  if (!db) {
    throw new Error("Firebase admin yapilandirmasi eksik.");
  }

  const session = createSessionToken();
  await db.collection("authSessions").doc(session.sessionId).set({
    uid: input.uid,
    username: input.username,
    email: input.email ?? null,
    tokenHash: session.tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: session.expiresAt,
  });

  const response = NextResponse.json({
    data: {
      username: input.username,
      email: input.email ?? null,
    },
  });
  await setSessionCookie(response, `${session.sessionId}.${session.token}`);
  return response;
}

export async function POST(request: Request) {
  const log = createRouteLogger("/api/auth/login", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const passwordTooShort = parsed.error.issues.some(
        (issue) => issue.path[0] === "password" && issue.code === "too_small",
      );

      log.warn("Login request validation failed", {
        issues: parsed.error.flatten(),
      });

      return NextResponse.json(
        {
          error: passwordTooShort
            ? "Sifre en az 6 karakter olmali."
            : "Kullanici adi veya sifre formati gecersiz.",
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const identifier = payload.username.trim().toLowerCase();
    const username = normalizeUsername(identifier);

    if (identifier.includes("@")) {
      try {
        const firebaseSession = await signInWithFirebaseEmailPassword(identifier, payload.password);
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
          throw new Error("Firebase auth yapilandirmasi eksik.");
        }

        const userRecord = await adminAuth.getUserByEmail(firebaseSession.email);
        if (userRecord.uid !== env.appOwnerId) {
          log.warn("Login blocked for non-owner Firebase user", {
            identifier,
            firebaseUid: userRecord.uid,
          });
          return NextResponse.json(
            { error: "Bu hesap panel sahibi olarak yetkili degil." },
            { status: 403 },
          );
        }

        const resolvedUsername =
          userRecord.displayName?.trim() ||
          normalizeUsername(firebaseSession.email.split("@")[0]) ||
          firebaseSession.email;

        await db.collection("users").doc(userRecord.uid).set(
          {
            uid: userRecord.uid,
            username: resolvedUsername,
            email: firebaseSession.email,
            provider: "firebase-auth",
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        const response = await createAppSession({
          uid: userRecord.uid,
          username: resolvedUsername,
          email: firebaseSession.email,
        });

        log.success(200, {
          username: resolvedUsername,
          email: firebaseSession.email,
          provider: "firebase-auth",
        });
        return response;
      } catch (error) {
        if (error instanceof FirebasePasswordAuthError) {
          log.warn("Login failed via Firebase Auth", {
            identifier,
            code: error.code,
          });
          return NextResponse.json({ error: error.message }, { status: 401 });
        }

        throw error;
      }
    }

    let snapshot = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snapshot.empty && identifier.includes("@")) {
      snapshot = await db.collection("users").where("email", "==", identifier).limit(1).get();
    }

    if (snapshot.empty) {
      log.warn("Login failed: user not found", { identifier });
      return NextResponse.json({ error: "Kullanici adi veya sifre hatali." }, { status: 401 });
    }

    const user = snapshot.docs[0].data() as UserCredentialRecord;
    if (user.uid !== env.appOwnerId) {
      log.warn("Login blocked for non-owner stored user", {
        username: user.username,
        uid: user.uid,
      });
      return NextResponse.json(
        { error: "Bu hesap panel sahibi olarak yetkili degil." },
        { status: 403 },
      );
    }

    const passwordValid = verifyPassword(payload.password, user.passwordSalt, user.passwordHash);
    if (!passwordValid) {
      log.warn("Login failed: invalid password", { username });
      return NextResponse.json({ error: "Kullanici adi veya sifre hatali." }, { status: 401 });
    }

    const response = await createAppSession({
      uid: user.uid,
      username: user.username,
      email: user.email,
    });
    log.success(200, { username: user.username });
    return response;
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Giris yapilamadi." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteLogger } from "@/lib/api-logging";
import { createSessionToken, normalizeUsername, verifyPassword } from "@/lib/auth/shared";
import { setSessionCookie } from "@/lib/auth/server";
import { getAdminDb } from "@/lib/firebase/admin";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

type UserCredentialRecord = {
  uid: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
};

export async function POST(request: Request) {
  const log = createRouteLogger("/api/auth/login", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const payload = schema.parse(body);
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const username = normalizeUsername(payload.username);
    const snapshot = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snapshot.empty) {
      log.warn("Login failed: user not found", { username });
      return NextResponse.json({ error: "Kullanici adi veya sifre hatali." }, { status: 401 });
    }

    const user = snapshot.docs[0].data() as UserCredentialRecord;
    const passwordValid = verifyPassword(payload.password, user.passwordSalt, user.passwordHash);
    if (!passwordValid) {
      log.warn("Login failed: invalid password", { username });
      return NextResponse.json({ error: "Kullanici adi veya sifre hatali." }, { status: 401 });
    }

    const session = createSessionToken();
    await db.collection("authSessions").doc(session.sessionId).set({
      uid: user.uid,
      username: user.username,
      tokenHash: session.tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt: session.expiresAt,
    });

    const response = NextResponse.json({ data: { username: user.username } });
    await setSessionCookie(response, `${session.sessionId}.${session.token}`);
    log.success(200, { username: user.username });
    return response;
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Giris yapilamadi." }, { status: 500 });
  }
}

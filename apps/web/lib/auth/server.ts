import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getAdminDb } from "@/lib/firebase/admin";

import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  hashSessionToken,
  parseSessionCookie,
} from "./shared";

type StoredSession = {
  uid: string;
  username: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

type AuthSession = {
  uid: string;
  username: string;
  sessionId: string;
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Oturum gecersiz." }, { status: 401 });
}

function extractSessionCookieFromHeader(cookieHeader?: string | null) {
  return (
    cookieHeader
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? null
  );
}

async function loadStoredSession(sessionId: string) {
  const db = getAdminDb();
  if (!db) {
    throw new Error("Firebase admin yapilandirmasi eksik.");
  }

  const doc = await db.collection("authSessions").doc(sessionId).get();
  if (!doc.exists) {
    return null;
  }

  return doc.data() as StoredSession;
}

export async function validateSessionCookie(value?: string | null): Promise<AuthSession | null> {
  const parsed = parseSessionCookie(value);
  if (!parsed) {
    return null;
  }

  const stored = await loadStoredSession(parsed.sessionId);
  if (!stored) {
    return null;
  }

  if (stored.uid !== env.appOwnerId) {
    return null;
  }

  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    const db = getAdminDb();
    await db?.collection("authSessions").doc(parsed.sessionId).delete();
    return null;
  }

  if (stored.tokenHash !== hashSessionToken(parsed.token)) {
    return null;
  }

  return {
    uid: stored.uid,
    username: stored.username,
    sessionId: parsed.sessionId,
  };
}

export async function requirePageSession() {
  const cookieStore = await cookies();
  const session = await validateSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null);
  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiSession(request: Request) {
  const session = await validateSessionCookie(extractSessionCookieFromHeader(request.headers.get("cookie")));

  return session ?? unauthorizedResponse();
}

export async function setSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(SESSION_COOKIE_NAME, value, getSessionCookieOptions());
  return response;
}

export async function clearSessionCookie(response: NextResponse, value?: string | null) {
  const parsed = parseSessionCookie(
    value?.includes("=") ? extractSessionCookieFromHeader(value) : value,
  );
  if (parsed) {
    const db = getAdminDb();
    await db?.collection("authSessions").doc(parsed.sessionId).delete();
  }

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function getCurrentPathname() {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "/";
}

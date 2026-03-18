import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "cf_session";
const SESSION_TTL_DAYS = 30;

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function buildLoginEmail(username: string) {
  return `${normalizeUsername(username)}@ctypto.app`;
}

export function generateRandomSecret(length = 18) {
  return randomBytes(length).toString("base64url");
}

export function createPasswordRecord(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actualHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

export function createSessionToken() {
  const sessionId = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("hex");
  return {
    sessionId,
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function parseSessionCookie(value?: string | null) {
  if (!value) {
    return null;
  }

  const [sessionId, token] = value.split(".");
  if (!sessionId || !token) {
    return null;
  }

  return { sessionId, token };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

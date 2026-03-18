import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ data: { ok: true } });
  await clearSessionCookie(response, request.headers.get("cookie") ?? null);
  return response;
}

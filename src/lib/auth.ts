import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

const SESSION_COOKIE_NAME = "ig_agent_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  exp: number;
  username: string;
};

function sign(value: string): string {
  return createHmac("sha256", serverEnv.appAuthSecret()).update(value).digest("base64url");
}

function safeStringEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function isValidDashboardCredentials(username: string, password: string): boolean {
  const expectedUsername = serverEnv.dashboardUsername();
  const expectedPassword = serverEnv.dashboardPassword();

  return safeStringEquals(username, expectedUsername) && safeStringEquals(password, expectedPassword);
}

export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (!safeStringEquals(signature, sign(encodedPayload))) {
    return null;
  }

  let payload: SessionPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.username !== "string" || typeof payload.exp !== "number") {
    return null;
  }

  if (payload.exp <= Date.now()) {
    return null;
  }

  if (!safeStringEquals(payload.username, serverEnv.dashboardUsername())) {
    return null;
  }

  return payload;
}

export async function getSessionFromCookieStore(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return parseSessionToken(token);
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export function setSessionCookie(response: NextResponse, username: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(username),
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export function requireApiAuth(request: NextRequest): NextResponse | null {
  if (!getSessionFromRequest(request)) {
    return unauthorizedJson();
  }

  return null;
}
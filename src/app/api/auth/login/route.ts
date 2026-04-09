import { NextRequest, NextResponse } from "next/server";

import { isValidDashboardCredentials, setSessionCookie } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };

  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  if (!isValidDashboardCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, serverEnv.dashboardUsername());

  return response;
}
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import { getAutomationSettings, updateAutomationEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const settings = await getAutomationSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as { automationEnabled?: boolean };

  if (typeof body.automationEnabled !== "boolean") {
    return NextResponse.json(
      { error: "automationEnabled must be a boolean." },
      { status: 400 },
    );
  }

  const settings = await updateAutomationEnabled(body.automationEnabled);
  return NextResponse.json({ settings });
}

import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import { listConversations } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

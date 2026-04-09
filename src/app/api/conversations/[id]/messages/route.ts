import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import { listMessages } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const messages = await listMessages(id);

  return NextResponse.json({ messages });
}

import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import { updateConversationMode } from "@/lib/conversations";
import type { ConversationMode } from "@/lib/types";

const validModes: ConversationMode[] = ["agent", "human"];

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { mode?: ConversationMode };

  if (!body.mode || !validModes.includes(body.mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  const conversation = await updateConversationMode(id, body.mode);

  return NextResponse.json({ conversation });
}

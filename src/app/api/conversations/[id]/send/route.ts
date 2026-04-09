import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import {
  getConversationById,
  insertAssistantMessage,
  touchConversation,
} from "@/lib/conversations";
import { sendInstagramMessage } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Message text is required." }, { status: 400 });
  }

  const conversation = await getConversationById(id);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const result = await sendInstagramMessage(conversation.igsid, text);

  await insertAssistantMessage({
    conversationId: conversation.id,
    content: text,
    source: "human",
    instagramMsgId: typeof result?.message_id === "string" ? result.message_id : null,
  });

  await touchConversation(conversation.id);

  return NextResponse.json({ ok: true });
}

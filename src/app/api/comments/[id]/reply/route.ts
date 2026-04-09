import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import {
  appendCommentMessage,
  getCommentThreadById,
  updateCommentThreadStatus,
} from "@/lib/comment-replies";
import { replyToInstagramComment } from "@/lib/instagram";

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
    return NextResponse.json({ error: "Reply text is required." }, { status: 400 });
  }

  const thread = await getCommentThreadById(id);

  if (!thread) {
    return NextResponse.json({ error: "Comment thread not found." }, { status: 404 });
  }

  const result = await replyToInstagramComment(thread.comment_id, text);

  await appendCommentMessage({
    threadId: thread.id,
    role: "assistant",
    source: "human",
    channel: "comment",
    content: text,
    instagramCommentId: typeof result?.id === "string" ? result.id : null,
  });

  await updateCommentThreadStatus({
    threadId: thread.id,
    status: "replied",
    replyCommentId: typeof result?.id === "string" ? result.id : null,
    errorMessage: null,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { listCommentMessages } from "@/lib/comment-replies";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const messages = await listCommentMessages(id);

  return NextResponse.json({ messages });
}

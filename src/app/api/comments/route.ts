import { NextResponse } from "next/server";

import { listCommentThreads } from "@/lib/comment-replies";

export const dynamic = "force-dynamic";

export async function GET() {
  const threads = await listCommentThreads();
  return NextResponse.json({ threads });
}

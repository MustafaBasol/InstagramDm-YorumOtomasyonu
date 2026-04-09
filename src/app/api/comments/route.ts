import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth";
import { listCommentThreads } from "@/lib/comment-replies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const threads = await listCommentThreads();
  return NextResponse.json({ threads });
}

import { NextResponse } from "next/server";

import { listMessages } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const messages = await listMessages(id);

  return NextResponse.json({ messages });
}


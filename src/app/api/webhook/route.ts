import { after, NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { processWebhookPayload } from "@/lib/webhook";
import type { MetaWebhookPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyToken === serverEnv.instagramVerifyToken()) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Invalid verify token." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as MetaWebhookPayload;

  after(async () => {
    try {
      await processWebhookPayload(payload);
    } catch (error) {
      console.error("Webhook processing failed.", error);
    }
  });

  return NextResponse.json({ received: true });
}


import "server-only";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { serverEnv } from "@/lib/env";
import {
  buildInstagramCommentSystemPrompt,
  buildInstagramSystemPrompt,
} from "@/lib/system-prompt";
import type { Conversation, Message } from "@/lib/types";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: serverEnv.openRouterApiKey(),
    baseURL: "https://openrouter.ai/api/v1",
  });
}

function getFallbackModels() {
  return Array.from(
    new Set([
      serverEnv.aiModel(),
      "google/gemma-3-12b-it:free",
      "google/gemma-3-4b-it:free",
      "google/gemma-2-9b-it:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ]),
  );
}

function extractJsonCandidate(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");

  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return raw.slice(braceStart, braceEnd + 1);
  }

  return raw;
}

function normalizeShortText(value: string, fallback: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (!cleaned) {
    return fallback;
  }

  return cleaned;
}

function parseCommentAndDmOutput(raw: string): {
  publicReply: string;
  dmReply: string;
} {
  const fallbackPublic = "Memnuniyetle yardimci oluruz. Detaylari DM'den iletiyoruz.";
  const fallbackDm =
    "Merhaba, ilginiz icin tesekkurler. Hangi konuda bilgi almak istiyorsunuz? 1) Fiyat 2) Hizmet detayi 3) Surec 4) Teklif";

  try {
    const parsed = JSON.parse(extractJsonCandidate(raw)) as {
      public_reply?: unknown;
      dm_reply?: unknown;
      publicReply?: unknown;
      dmReply?: unknown;
    };

    const publicRaw =
      typeof parsed.public_reply === "string"
        ? parsed.public_reply
        : typeof parsed.publicReply === "string"
          ? parsed.publicReply
          : "";

    const dmRaw =
      typeof parsed.dm_reply === "string"
        ? parsed.dm_reply
        : typeof parsed.dmReply === "string"
          ? parsed.dmReply
          : "";

    return {
      publicReply: normalizeShortText(publicRaw, fallbackPublic),
      dmReply: normalizeShortText(dmRaw, fallbackDm),
    };
  } catch {
    return {
      publicReply: fallbackPublic,
      dmReply: fallbackDm,
    };
  }
}

function normalizeDmOutput(raw: string): string {
  try {
    const parsed = JSON.parse(extractJsonCandidate(raw)) as {
      dm_reply?: unknown;
      dmReply?: unknown;
      public_reply?: unknown;
      publicReply?: unknown;
      mode?: unknown;
      intent?: unknown;
    };

    const dmCandidate =
      typeof parsed.dm_reply === "string"
        ? parsed.dm_reply
        : typeof parsed.dmReply === "string"
          ? parsed.dmReply
          : typeof parsed.public_reply === "string"
            ? parsed.public_reply
            : typeof parsed.publicReply === "string"
              ? parsed.publicReply
              : "";

    const cleaned = dmCandidate.trim();

    if (cleaned) {
      return cleaned;
    }
  } catch {
    // no-op
  }

  return raw.trim();
}

async function completeWithFallback(
  payload: ChatCompletionMessageParam[],
): Promise<string> {
  const openai = getOpenAIClient();

  for (const model of getFallbackModels()) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: payload,
      });

      const content = completion.choices[0]?.message?.content;

      if (typeof content === "string" && content.trim().length > 0) {
        return content.trim();
      }
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : undefined;

      console.warn(`OpenRouter model ${model} failed with ${status ?? "unknown"}. Trying next.`);
    }
  }

  return "Sorry, I'm temporarily unavailable. Please try again shortly.";
}

export async function getAIResponse(
  messages: Message[],
  conversation: Conversation,
): Promise<string> {
  const payload: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildInstagramSystemPrompt(conversation),
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    } satisfies ChatCompletionMessageParam)),
  ];

  const raw = await completeWithFallback(payload);
  return normalizeDmOutput(raw);
}

export async function getAICommentAndDmReplies(params: {
  commentText: string;
  commenterUsername: string | null;
}): Promise<{ publicReply: string; dmReply: string }> {
  const payload: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildInstagramCommentSystemPrompt(params.commenterUsername),
    },
    {
      role: "user",
      content: [
        `Comment: ${params.commentText}`,
        "Respond with STRICT JSON only.",
        '{"public_reply":"...","dm_reply":"..."}',
        "public_reply must be short and suitable for public comment.",
        "dm_reply must be richer and ask a focused next-step question.",
      ].join("\n"),
    },
  ];

  const raw = await completeWithFallback(payload);
  return parseCommentAndDmOutput(raw);
}

export async function getAICommentReply(params: {
  commentText: string;
  commenterUsername: string | null;
}): Promise<string> {
  const replies = await getAICommentAndDmReplies(params);
  return replies.publicReply;
}

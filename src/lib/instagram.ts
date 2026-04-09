import "server-only";

import { serverEnv } from "@/lib/env";
import type { InstagramProfile } from "@/lib/types";

export async function fetchInstagramProfile(igsid: string): Promise<InstagramProfile> {
  const url = new URL(`https://graph.instagram.com/v24.0/${igsid}`);

  url.searchParams.set(
    "fields",
    "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user",
  );
  url.searchParams.set("access_token", serverEnv.instagramAccessToken());

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Instagram profile fetch failed: ${JSON.stringify(data)}`);
  }

  return {
    name: typeof data.name === "string" ? data.name : null,
    username: typeof data.username === "string" ? data.username : null,
    profile_pic: typeof data.profile_pic === "string" ? data.profile_pic : null,
    follower_count:
      typeof data.follower_count === "number" ? data.follower_count : null,
    is_user_follow_business:
      typeof data.is_user_follow_business === "boolean"
        ? data.is_user_follow_business
        : null,
    is_business_follow_user:
      typeof data.is_business_follow_user === "boolean"
        ? data.is_business_follow_user
        : null,
  };
}

export async function sendInstagramMessage(recipientIgsid: string, text: string) {
  const url = new URL("https://graph.instagram.com/v24.0/me/messages");

  url.searchParams.set("access_token", serverEnv.instagramAccessToken());

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram send failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function sendInstagramPrivateReply(commentId: string, text: string) {
  const url = new URL("https://graph.instagram.com/v24.0/me/messages");

  url.searchParams.set("access_token", serverEnv.instagramAccessToken());

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text },
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram private reply failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function replyToInstagramComment(commentId: string, text: string) {
  const url = new URL(`https://graph.instagram.com/v24.0/${commentId}/replies`);

  url.searchParams.set("access_token", serverEnv.instagramAccessToken());
  url.searchParams.set("message", text);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Instagram comment reply failed: ${JSON.stringify(data)}`);
  }

  return data;
}

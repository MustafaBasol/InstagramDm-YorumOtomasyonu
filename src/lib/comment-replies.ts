import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import type { CommentMessage, CommentReplyStatus, CommentThread } from "@/lib/types";

type CommentMessageInsert =
  Database["public"]["Tables"]["instagram_comment_messages"]["Insert"];
type CommentMessageRow =
  Database["public"]["Tables"]["instagram_comment_messages"]["Row"];
type CommentThreadInsert =
  Database["public"]["Tables"]["instagram_comment_replies"]["Insert"];
type CommentThreadRow =
  Database["public"]["Tables"]["instagram_comment_replies"]["Row"];

function getAdmin() {
  return createAdminClient();
}

function mapCommentMessage(row: CommentMessageRow): CommentMessage {
  return row;
}

function mapCommentThread(row: CommentThreadRow): CommentThread {
  return {
    ...row,
    last_message: null,
    last_message_at: null,
  };
}

export async function listCommentThreads(): Promise<CommentThread[]> {
  const admin = getAdmin();
  const { data: threads, error } = await admin
    .from("instagram_comment_replies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!threads || threads.length === 0) {
    return [];
  }

  const threadIds = threads.map((thread) => thread.id);
  const { data: messages, error: messageError } = await admin
    .from("instagram_comment_messages")
    .select("comment_thread_id, content, created_at")
    .in("comment_thread_id", threadIds)
    .order("created_at", { ascending: false });

  if (messageError) {
    throw messageError;
  }

  const latestByThread = new Map<
    string,
    { content: string; created_at: string }
  >();

  for (const message of messages ?? []) {
    if (!latestByThread.has(message.comment_thread_id)) {
      latestByThread.set(message.comment_thread_id, message);
    }
  }

  return threads.map((thread) => {
    const mapped = mapCommentThread(thread);
    const latest = latestByThread.get(thread.id);

    return {
      ...mapped,
      last_message: latest?.content ?? thread.ai_response ?? thread.comment_text,
      last_message_at: latest?.created_at ?? thread.updated_at,
    };
  });
}

export async function getCommentThreadById(id: string): Promise<CommentThread | null> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_comment_replies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapCommentThread(data) : null;
}

export async function listCommentMessages(threadId: string): Promise<CommentMessage[]> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_comment_messages")
    .select("*")
    .eq("comment_thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCommentMessage);
}

export async function reserveCommentReply(params: {
  commentId: string;
  mediaId: string | null;
  commenterIgsid: string | null;
  commenterUsername: string | null;
  commentText: string;
}): Promise<{ isNew: boolean; thread: CommentThread }> {
  const admin = getAdmin();

  const { data: existing, error: existingError } = await admin
    .from("instagram_comment_replies")
    .select("*")
    .eq("comment_id", params.commentId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return { isNew: false, thread: mapCommentThread(existing) };
  }

  const payload: CommentThreadInsert = {
    comment_id: params.commentId,
    media_id: params.mediaId,
    commenter_igsid: params.commenterIgsid,
    commenter_username: params.commenterUsername,
    comment_text: params.commentText,
    status: "pending",
  };

  const { data, error } = await admin
    .from("instagram_comment_replies")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: deduped, error: dedupeError } = await admin
        .from("instagram_comment_replies")
        .select("*")
        .eq("comment_id", params.commentId)
        .single();

      if (dedupeError) {
        throw dedupeError;
      }

      return { isNew: false, thread: mapCommentThread(deduped) };
    }

    throw error;
  }

  return { isNew: true, thread: mapCommentThread(data) };
}

export async function appendCommentMessage(params: {
  threadId: string;
  role: "user" | "assistant";
  source: "instagram" | "agent" | "human";
  channel: "comment" | "dm";
  content: string;
  instagramCommentId?: string | null;
}) {
  const admin = getAdmin();
  const payload: CommentMessageInsert = {
    comment_thread_id: params.threadId,
    role: params.role,
    source: params.source,
    channel: params.channel,
    content: params.content,
    instagram_comment_id: params.instagramCommentId ?? null,
  };

  const { error } = await admin.from("instagram_comment_messages").insert(payload);

  if (error) {
    throw error;
  }
}

export async function updateCommentThreadStatus(params: {
  threadId: string;
  status: CommentReplyStatus;
  aiResponse?: string | null;
  replyCommentId?: string | null;
  errorMessage?: string | null;
}) {
  const admin = getAdmin();
  const now = new Date().toISOString();

  const updatePayload: Database["public"]["Tables"]["instagram_comment_replies"]["Update"] = {
    status: params.status,
    updated_at: now,
    replied_at: params.status === "replied" ? now : null,
    error_message: params.errorMessage ?? null,
  };

  if (typeof params.aiResponse !== "undefined") {
    updatePayload.ai_response = params.aiResponse;
  }

  if (typeof params.replyCommentId !== "undefined") {
    updatePayload.reply_comment_id = params.replyCommentId;
  }

  const { error } = await admin
    .from("instagram_comment_replies")
    .update(updatePayload)
    .eq("id", params.threadId);

  if (error) {
    throw error;
  }
}

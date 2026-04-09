import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  Conversation,
  ConversationMode,
  InstagramProfile,
  Message,
  MessageSource,
} from "@/lib/types";

type ConversationInsert =
  Database["public"]["Tables"]["instagram_conversations"]["Insert"];
type ConversationRow = Database["public"]["Tables"]["instagram_conversations"]["Row"];
type MessageInsert = Database["public"]["Tables"]["instagram_messages"]["Insert"];
type MessageRow = Database["public"]["Tables"]["instagram_messages"]["Row"];

function getAdmin() {
  return createAdminClient();
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    ...row,
    last_message: null,
    last_message_at: null,
    last_message_role: null,
    last_message_source: null,
  };
}

function mapMessage(row: MessageRow): Message {
  return row;
}

export async function listConversations(): Promise<Conversation[]> {
  const admin = getAdmin();
  const { data: conversations, error } = await admin
    .from("instagram_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!conversations || conversations.length === 0) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: messages, error: messageError } = await admin
    .from("instagram_messages")
    .select("conversation_id, content, created_at, role, source")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messageError) {
    throw messageError;
  }

  const latestByConversation = new Map<
    string,
    {
      content: string;
      created_at: string;
      role: Message["role"];
      source: MessageSource;
    }
  >();

  for (const message of messages ?? []) {
    if (!latestByConversation.has(message.conversation_id)) {
      latestByConversation.set(message.conversation_id, message);
    }
  }

  return conversations.map((conversation) => {
    const latest = latestByConversation.get(conversation.id);

    return {
      ...mapConversation(conversation),
      last_message: latest?.content ?? null,
      last_message_at: latest?.created_at ?? null,
      last_message_role: latest?.role ?? null,
      last_message_source: latest?.source ?? null,
    };
  });
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapConversation(data) : null;
}

export async function upsertConversationFromInstagram(
  igsid: string,
  profile: InstagramProfile | null,
): Promise<Conversation> {
  const admin = getAdmin();
  const payload: ConversationInsert = {
    igsid,
    updated_at: new Date().toISOString(),
    ...(profile ?? {}),
  };

  const { data, error } = await admin
    .from("instagram_conversations")
    .upsert(payload, { onConflict: "igsid" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapConversation(data);
}

export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMessage);
}

export async function listRecentMessagesForAI(conversationId: string): Promise<Message[]> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse().map(mapMessage);
}

export async function insertUserMessage(params: {
  conversationId: string;
  content: string;
  instagramMsgId?: string | null;
}): Promise<boolean> {
  const admin = getAdmin();

  if (params.instagramMsgId) {
    const { data: existing, error: existingError } = await admin
      .from("instagram_messages")
      .select("id")
      .eq("instagram_msg_id", params.instagramMsgId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return false;
    }
  }

  const payload: MessageInsert = {
    conversation_id: params.conversationId,
    role: "user",
    source: "instagram",
    content: params.content,
    instagram_msg_id: params.instagramMsgId ?? null,
  };

  const { error } = await admin.from("instagram_messages").insert(payload);

  if (error) {
    throw error;
  }

  return true;
}

export async function insertAssistantMessage(params: {
  conversationId: string;
  content: string;
  source: Extract<MessageSource, "agent" | "human">;
  instagramMsgId?: string | null;
}) {
  const admin = getAdmin();
  const payload: MessageInsert = {
    conversation_id: params.conversationId,
    role: "assistant",
    source: params.source,
    content: params.content,
    instagram_msg_id: params.instagramMsgId ?? null,
  };

  const { error } = await admin.from("instagram_messages").insert(payload);

  if (error) {
    throw error;
  }
}

export async function updateConversationMode(id: string, mode: ConversationMode) {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("instagram_conversations")
    .update({
      mode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapConversation(data);
}

export async function touchConversation(id: string) {
  const admin = getAdmin();
  const { error } = await admin
    .from("instagram_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

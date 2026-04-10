export type ConversationMode = "agent" | "human";
export type MessageRole = "user" | "assistant";
export type MessageSource = "instagram" | "agent" | "human";
export type CommentReplyStatus = "pending" | "replied" | "failed";
export type CommentMessageChannel = "comment" | "dm";

export interface AutomationSettings {
  id: number;
  automation_enabled: boolean;
  updated_at: string;
}

export interface InstagramProfile {
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
}

export interface Conversation {
  id: string;
  igsid: string;
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
  mode: ConversationMode;
  updated_at: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  last_message_role: MessageRole | null;
  last_message_source: MessageSource | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  source: MessageSource;
  content: string;
  instagram_msg_id: string | null;
  created_at: string;
}

export interface CommentThread {
  id: string;
  comment_id: string;
  media_id: string | null;
  commenter_igsid: string | null;
  commenter_username: string | null;
  comment_text: string;
  ai_response: string | null;
  reply_comment_id: string | null;
  status: CommentReplyStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  replied_at: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

export interface CommentMessage {
  id: string;
  comment_thread_id: string;
  role: MessageRole;
  source: MessageSource;
  channel: CommentMessageChannel;
  content: string;
  instagram_comment_id: string | null;
  created_at: string;
}

export interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
}

export interface MetaCommentChangeValue {
  id?: string;
  text?: string;
  from?: {
    id?: string;
    username?: string;
  };
  media?: {
    id?: string;
  };
  parent_id?: string;
}

export interface MetaWebhookChange {
  field?: string;
  value?: MetaCommentChangeValue;
}

export interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: MetaMessagingEvent[];
    changes?: MetaWebhookChange[];
  }>;
}

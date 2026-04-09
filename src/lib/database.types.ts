import type {
  CommentMessageChannel,
  CommentReplyStatus,
  ConversationMode,
  MessageRole,
  MessageSource,
} from "@/lib/types";

export interface Database {
  public: {
    Tables: {
      instagram_conversations: {
        Row: {
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
        };
        Insert: {
          id?: string;
          igsid: string;
          name?: string | null;
          username?: string | null;
          profile_pic?: string | null;
          follower_count?: number | null;
          is_user_follow_business?: boolean | null;
          is_business_follow_user?: boolean | null;
          mode?: ConversationMode;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          igsid?: string;
          name?: string | null;
          username?: string | null;
          profile_pic?: string | null;
          follower_count?: number | null;
          is_user_follow_business?: boolean | null;
          is_business_follow_user?: boolean | null;
          mode?: ConversationMode;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      instagram_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          source: MessageSource;
          content: string;
          instagram_msg_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: MessageRole;
          source?: MessageSource;
          content: string;
          instagram_msg_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: MessageRole;
          source?: MessageSource;
          content?: string;
          instagram_msg_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instagram_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "instagram_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      instagram_comment_replies: {
        Row: {
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
        };
        Insert: {
          id?: string;
          comment_id: string;
          media_id?: string | null;
          commenter_igsid?: string | null;
          commenter_username?: string | null;
          comment_text: string;
          ai_response?: string | null;
          reply_comment_id?: string | null;
          status?: CommentReplyStatus;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          replied_at?: string | null;
        };
        Update: {
          id?: string;
          comment_id?: string;
          media_id?: string | null;
          commenter_igsid?: string | null;
          commenter_username?: string | null;
          comment_text?: string;
          ai_response?: string | null;
          reply_comment_id?: string | null;
          status?: CommentReplyStatus;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          replied_at?: string | null;
        };
        Relationships: [];
      };
      instagram_comment_messages: {
        Row: {
          id: string;
          comment_thread_id: string;
          role: MessageRole;
          source: MessageSource;
          channel: CommentMessageChannel;
          content: string;
          instagram_comment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_thread_id: string;
          role: MessageRole;
          source?: MessageSource;
          channel?: CommentMessageChannel;
          content: string;
          instagram_comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_thread_id?: string;
          role?: MessageRole;
          source?: MessageSource;
          channel?: CommentMessageChannel;
          content?: string;
          instagram_comment_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instagram_comment_messages_comment_thread_id_fkey";
            columns: ["comment_thread_id"];
            isOneToOne: false;
            referencedRelation: "instagram_comment_replies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

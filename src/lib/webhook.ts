import { getAICommentAndDmReplies, getAIResponse } from "@/lib/ai";
import {
  appendCommentMessage,
  reserveCommentReply,
  updateCommentThreadStatus,
} from "@/lib/comment-replies";
import {
  insertAssistantMessage,
  insertUserMessage,
  listRecentMessagesForAI,
  touchConversation,
  upsertConversationFromInstagram,
} from "@/lib/conversations";
import {
  fetchInstagramProfile,
  replyToInstagramComment,
  sendInstagramMessage,
  sendInstagramPrivateReply,
} from "@/lib/instagram";
import { getAutomationSettings } from "@/lib/settings";
import type {
  MetaCommentChangeValue,
  MetaMessagingEvent,
  MetaWebhookPayload,
} from "@/lib/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

async function processMessagingEvent(
  event: MetaMessagingEvent,
  automationEnabled: boolean,
) {
  const senderId = event.sender?.id;
  const text = event.message?.text?.trim();

  if (!senderId || !text) {
    return;
  }

  if (event.message?.is_echo) {
    return;
  }

  let profile = null;

  try {
    profile = await fetchInstagramProfile(senderId);
  } catch (error) {
    console.error("Failed to refresh Instagram profile.", error);
  }

  const conversation = await upsertConversationFromInstagram(senderId, profile);
  const inserted = await insertUserMessage({
    conversationId: conversation.id,
    content: text,
    instagramMsgId: event.message?.mid ?? null,
  });

  if (!inserted) {
    return;
  }

  await touchConversation(conversation.id);

  if (!automationEnabled || conversation.mode === "human") {
    return;
  }

  const context = await listRecentMessagesForAI(conversation.id);
  const responseText = await getAIResponse(context, conversation);
  const sendResult = await sendInstagramMessage(senderId, responseText);

  await insertAssistantMessage({
    conversationId: conversation.id,
    content: responseText,
    source: "agent",
    instagramMsgId:
      typeof sendResult?.message_id === "string" ? sendResult.message_id : null,
  });

  await touchConversation(conversation.id);
}

async function processCommentChange(
  businessIgsid: string | undefined,
  changeValue: MetaCommentChangeValue | undefined,
  automationEnabled: boolean,
) {
  const commentId = changeValue?.id;
  const commentText = changeValue?.text?.trim();
  const commenterIgsid = changeValue?.from?.id ?? null;
  const commenterUsername = changeValue?.from?.username ?? null;
  const mediaId = changeValue?.media?.id ?? null;

  if (!commentId || !commentText) {
    return;
  }

  if (businessIgsid && commenterIgsid && commenterIgsid === businessIgsid) {
    return;
  }

  const reservation = await reserveCommentReply({
    commentId,
    mediaId,
    commenterIgsid,
    commenterUsername,
    commentText,
  });

  if (!reservation.isNew) {
    return;
  }

  await appendCommentMessage({
    threadId: reservation.thread.id,
    role: "user",
    source: "instagram",
    channel: "comment",
    content: commentText,
    instagramCommentId: commentId,
  });

  if (!automationEnabled) {
    return;
  }

  let publicReply: string | null = null;
  let publicReplyId: string | null = null;

  try {
    const aiReplies = await getAICommentAndDmReplies({
      commentText,
      commenterUsername,
    });

    publicReply = aiReplies.publicReply;

    const publicResult = await replyToInstagramComment(commentId, aiReplies.publicReply);
    publicReplyId = typeof publicResult?.id === "string" ? publicResult.id : null;

    await appendCommentMessage({
      threadId: reservation.thread.id,
      role: "assistant",
      source: "agent",
      channel: "comment",
      content: aiReplies.publicReply,
      instagramCommentId: publicReplyId,
    });

    const dmResult = await sendInstagramPrivateReply(commentId, aiReplies.dmReply);
    const dmMessageId =
      typeof dmResult?.message_id === "string" ? dmResult.message_id : null;

    await appendCommentMessage({
      threadId: reservation.thread.id,
      role: "assistant",
      source: "agent",
      channel: "dm",
      content: aiReplies.dmReply,
      instagramCommentId: dmMessageId,
    });

    const profileTargetIgsid = commenterIgsid ?? (
      typeof dmResult?.recipient_id === "string" ? dmResult.recipient_id : null
    );

    if (profileTargetIgsid) {
      let profile = null;

      try {
        profile = await fetchInstagramProfile(profileTargetIgsid);
      } catch (error) {
        console.error("Failed to refresh Instagram profile from comment event.", error);
      }

      const conversation = await upsertConversationFromInstagram(profileTargetIgsid, profile);

      await insertAssistantMessage({
        conversationId: conversation.id,
        content: aiReplies.dmReply,
        source: "agent",
        instagramMsgId: dmMessageId,
      });

      await touchConversation(conversation.id);
    }

    await updateCommentThreadStatus({
      threadId: reservation.thread.id,
      status: "replied",
      aiResponse: aiReplies.publicReply,
      replyCommentId: publicReplyId,
      errorMessage: null,
    });
  } catch (error) {
    await updateCommentThreadStatus({
      threadId: reservation.thread.id,
      status: "failed",
      aiResponse: publicReply,
      replyCommentId: publicReplyId,
      errorMessage: getErrorMessage(error),
    });

    console.error(`Failed to auto-reply to comment ${commentId}.`, error);
  }
}

export async function processWebhookPayload(payload: MetaWebhookPayload) {
  const entries = payload.entry ?? [];
  const settings = await getAutomationSettings();

  for (const entry of entries) {
    for (const event of entry.messaging ?? []) {
      await processMessagingEvent(event, settings.automation_enabled);
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") {
        continue;
      }

      await processCommentChange(entry.id, change.value, settings.automation_enabled);
    }
  }
}

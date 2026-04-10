
"use client";

import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";

import type {
  AutomationSettings,
  CommentMessage,
  CommentThread,
  Conversation,
  ConversationMode,
  Message,
} from "@/lib/types";
import {
  formatCompactNumber,
  formatMessageTimestamp,
  formatRelativeTimestamp,
  getInitials,
  truncateText,
} from "@/lib/utils";

interface DashboardShellProps {
  initialConversations: Conversation[];
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Session expired.");
    }

    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

function ConversationAvatar({
  name,
  username,
  profilePic,
  size = 48,
}: {
  name: string | null;
  username: string | null;
  profilePic: string | null;
  size?: number;
}) {
  const initials = getInitials(name, username);

  if (profilePic) {
    return (
      <Image
        src={profilePic}
        alt={name ?? username ?? "Instagram user"}
        width={size}
        height={size}
        className="rounded-2xl object-cover"
      />
    );
  }

  return (
    <div
      className="grid rounded-2xl bg-gradient-to-br from-orange-400 via-rose-500 to-violet-500 font-semibold text-white"
      style={{ width: size, height: size, placeItems: "center" }}
    >
      {initials}
    </div>
  );
}

function commentStatusClass(status: CommentThread["status"]) {
  if (status === "failed") {
    return "bg-red-500/15 text-red-200 ring-1 ring-red-400/30";
  }

  if (status === "pending") {
    return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/30";
  }

  return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/30";
}

function commentStatusLabel(status: CommentThread["status"]) {
  if (status === "failed") {
    return "Failed";
  }

  if (status === "pending") {
    return "Queued";
  }

  return "Replied";
}

export function DashboardShell({ initialConversations }: DashboardShellProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([]);
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);
  const [commentMessages, setCommentMessages] = useState<CommentMessage[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingCommentMessages, setIsLoadingCommentMessages] = useState(false);
  const [isSendingCommentReply, setIsSendingCommentReply] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);

  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const activeCommentThreadIdRef = useRef<string | null>(activeCommentThreadId);
  const [uiError, setUiError] = useState<string | null>(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;

  const activeCommentThread =
    commentThreads.find((thread) => thread.id === activeCommentThreadId) ?? null;

  const automationEnabled = settings?.automation_enabled ?? true;

  function setError(error: unknown) {
    if (error instanceof Error) {
      setUiError(error.message);
      return;
    }

    setUiError("Something went wrong.");
  }

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    activeCommentThreadIdRef.current = activeCommentThreadId;
  }, [activeCommentThreadId]);

  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (commentThreads.length > 0 && !activeCommentThreadId) {
      setActiveCommentThreadId(commentThreads[0].id);
    }
  }, [activeCommentThreadId, commentThreads]);

  async function loadSettings() {
    const data = await fetchJson<{ settings: AutomationSettings }>("/api/settings");
    setSettings(data.settings);
  }

  async function refreshConversations(preferredConversationId?: string | null) {
    const data = await fetchJson<{ conversations: Conversation[] }>("/api/conversations");

    setConversations(data.conversations);

    if (preferredConversationId) {
      const stillExists = data.conversations.some(
        (conversation) => conversation.id === preferredConversationId,
      );

      if (stillExists) {
        setActiveConversationId(preferredConversationId);
        return;
      }
    }

    if (!data.conversations.some((conversation) => conversation.id === activeConversationIdRef.current)) {
      setActiveConversationId(data.conversations[0]?.id ?? null);
    }
  }

  async function loadMessages(
    conversationId: string,
    options?: { showLoading?: boolean },
  ) {
    const showLoading = options?.showLoading ?? true;

    if (showLoading) {
      setIsLoadingMessages(true);
    }

    try {
      const data = await fetchJson<{ messages: Message[] }>(
        `/api/conversations/${conversationId}/messages`,
      );
      setMessages(data.messages);
    } finally {
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }
  }

  async function refreshCommentThreads(preferredThreadId?: string | null) {
    const data = await fetchJson<{ threads: CommentThread[] }>("/api/comments");

    setCommentThreads(data.threads);

    if (preferredThreadId) {
      const stillExists = data.threads.some((thread) => thread.id === preferredThreadId);

      if (stillExists) {
        setActiveCommentThreadId(preferredThreadId);
        return;
      }
    }

    if (!data.threads.some((thread) => thread.id === activeCommentThreadIdRef.current)) {
      setActiveCommentThreadId(data.threads[0]?.id ?? null);
    }
  }

  async function loadCommentMessages(
    threadId: string,
    options?: { showLoading?: boolean },
  ) {
    const showLoading = options?.showLoading ?? true;

    if (showLoading) {
      setIsLoadingCommentMessages(true);
    }

    try {
      const data = await fetchJson<{ messages: CommentMessage[] }>(
        `/api/comments/${threadId}/messages`,
      );
      setCommentMessages(data.messages);
    } finally {
      if (showLoading) {
        setIsLoadingCommentMessages(false);
      }
    }
  }
  useEffect(() => {
    if (initialConversations.length === 0) {
      void refreshConversations().catch(setError);
    }

    void Promise.all([loadSettings(), refreshCommentThreads()]).catch(setError);
  }, [initialConversations.length]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeConversationId).catch(setError);
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeCommentThreadId) {
      setCommentMessages([]);
      return;
    }

    void loadCommentMessages(activeCommentThreadId).catch(setError);
  }, [activeCommentThreadId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        void refreshConversations(activeConversationIdRef.current).catch(setError);
        void refreshCommentThreads(activeCommentThreadIdRef.current).catch(setError);

        if (activeConversationIdRef.current) {
          void loadMessages(activeConversationIdRef.current, { showLoading: false }).catch(setError);
        }

        if (activeCommentThreadIdRef.current) {
          void loadCommentMessages(activeCommentThreadIdRef.current, { showLoading: false }).catch(setError);
        }
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);
  async function handleModeChange(mode: ConversationMode) {
    if (!activeConversation) {
      return;
    }

    setIsUpdatingMode(true);

    try {
      await fetchJson(`/api/conversations/${activeConversation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ mode }),
      });
      await refreshConversations(activeConversation.id);
    } catch (error) {
      setError(error);
    } finally {
      setIsUpdatingMode(false);
    }
  }

  async function handleAutomationToggle(nextValue: boolean) {
    setIsUpdatingAutomation(true);

    try {
      const data = await fetchJson<{ settings: AutomationSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ automationEnabled: nextValue }),
      });
      setSettings(data.settings);
    } catch (error) {
      setError(error);
    } finally {
      setIsUpdatingAutomation(false);
    }
  }

  async function handleSend() {
    if (!activeConversation || !draft.trim()) {
      return;
    }

    setIsSending(true);

    try {
      await fetchJson(`/api/conversations/${activeConversation.id}/send`, {
        method: "POST",
        body: JSON.stringify({ text: draft }),
      });
      setDraft("");
      await Promise.all([
        refreshConversations(activeConversation.id),
        loadMessages(activeConversation.id, { showLoading: false }),
      ]);
    } catch (error) {
      setError(error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendCommentReply() {
    if (!activeCommentThread || !commentDraft.trim()) {
      return;
    }

    setIsSendingCommentReply(true);

    try {
      await fetchJson(`/api/comments/${activeCommentThread.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: commentDraft }),
      });
      setCommentDraft("");
      await Promise.all([
        refreshCommentThreads(activeCommentThread.id),
        loadCommentMessages(activeCommentThread.id, { showLoading: false }),
      ]);
    } catch (error) {
      setError(error);
    } finally {
      setIsSendingCommentReply(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetchJson("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Redirect regardless of API result so an expired session can still return to login.
    } finally {
      window.location.href = "/login";
    }
  }

  const pendingCommentCount = commentThreads.filter((thread) => thread.status === "pending").length;

  return (
    <main className="min-h-screen px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-fade-up">
        <section className="rounded-[2rem] border border-white/10 bg-hero-mesh px-6 py-7 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-orange-200/80">
                Instagram Messaging Ops
              </p>
              <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
                One inbox for DM and post comments.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
                AI handles both DMs and comments. You can monitor comment threads and continue manually any time.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm text-slate-200 sm:min-w-[320px]">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Global Automation
                  </div>
                  <div className="mt-1 text-sm text-white">
                    {automationEnabled ? "AI replies are active." : "New messages are recorded only."}
                  </div>
                </div>
                <div className="inline-flex rounded-full border border-white/10 bg-[#0b1120]/70 p-1">
                  <button
                    type="button"
                    disabled={isUpdatingAutomation || settings === null}
                    onClick={() => void handleAutomationToggle(true)}
                    className={`rounded-full px-3 py-2 text-xs transition ${
                      automationEnabled
                        ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingAutomation || settings === null}
                    onClick={() => void handleAutomationToggle(false)}
                    className={`rounded-full px-3 py-2 text-xs transition ${
                      !automationEnabled
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-slate-400">Conversations</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{conversations.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-slate-400">Comment Threads</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{commentThreads.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-slate-400">Comments Pending</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{pendingCommentCount}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="shrink-0 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {uiError ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {uiError}
          </section>
        ) : null}

        <section className="grid min-h-[72vh] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-panel backdrop-blur">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
                Conversations
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Sorted by latest DM activity.
              </p>
            </div>

            <div className="scrollbar-thin max-h-[calc(72vh-5rem)] space-y-2 overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-slate-400">
                  No conversations yet. Incoming DMs will show here.
                </div>
              ) : null}
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const modeClasses =
                  conversation.mode === "agent"
                    ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30"
                    : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-300/30";

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={`w-full rounded-[1.6rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-white/10 bg-white/[0.08] shadow-[inset_4px_0_0_0_rgba(251,113,133,1)]"
                        : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ConversationAvatar
                        name={conversation.name}
                        username={conversation.username}
                        profilePic={conversation.profile_pic}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white">
                              {conversation.name ?? conversation.username ?? "Instagram User"}
                            </div>
                            <div className="truncate text-sm text-slate-400">
                              @{conversation.username ?? conversation.igsid}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatRelativeTimestamp(conversation.last_message_at ?? conversation.updated_at)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="line-clamp-2 text-sm leading-5 text-slate-300">
                            {truncateText(conversation.last_message)}
                          </p>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${modeClasses}`}>
                            {conversation.mode === "agent" ? "AI" : "You"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-panel backdrop-blur">
            {activeConversation ? (
              <>
                <header className="border-b border-white/10 px-5 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <ConversationAvatar
                        name={activeConversation.name}
                        username={activeConversation.username}
                        profilePic={activeConversation.profile_pic}
                        size={64}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
                            {activeConversation.name ?? activeConversation.username ?? "Instagram User"}
                          </h2>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
                            @{activeConversation.username ?? activeConversation.igsid}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                          <span>{formatCompactNumber(activeConversation.follower_count)} followers</span>
                          {activeConversation.is_business_follow_user ? (
                            <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs text-fuchsia-200 ring-1 ring-fuchsia-400/25">
                              Follows you
                            </span>
                          ) : null}
                          {activeConversation.is_user_follow_business ? (
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-400/25">
                              You follow
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        disabled={isUpdatingMode}
                        onClick={() => void handleModeChange("agent")}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          activeConversation.mode === "agent"
                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        AI Mode
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingMode}
                        onClick={() => void handleModeChange("human")}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          activeConversation.mode === "human"
                            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Human Mode
                      </button>
                    </div>
                  </div>
                </header>

                <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-6">
                  {isLoadingMessages ? (
                    <div className="text-sm text-slate-400">Loading conversation...</div>
                  ) : null}

                  {!isLoadingMessages && messages.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
                      This thread is empty. Incoming or manual replies will appear here.
                    </div>
                  ) : null}
                  {messages.map((message) => {
                    const isAssistant = message.role === "assistant";
                    const assistantLabel = message.source === "human" ? "You" : "AI";

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-3 ${
                          isAssistant ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isAssistant ? (
                          <ConversationAvatar
                            name={activeConversation.name}
                            username={activeConversation.username}
                            profilePic={activeConversation.profile_pic}
                            size={36}
                          />
                        ) : null}
                        <div
                          className={`max-w-[82%] rounded-[1.6rem] px-4 py-3 shadow-lg sm:max-w-[70%] ${
                            isAssistant
                              ? "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white"
                              : "border border-white/10 bg-white/[0.04] text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                          <div
                            className={`mt-2 flex items-center gap-2 text-[11px] ${
                              isAssistant ? "text-white/75" : "text-slate-400"
                            }`}
                          >
                            {isAssistant ? <span>{assistantLabel} |</span> : null}
                            <span>{formatMessageTimestamp(message.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="border-t border-white/10 px-5 py-4">
                  <div className="rounded-[1.6rem] border border-white/10 bg-[#0b1120]/80 p-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={3}
                      placeholder={
                        activeConversation.mode === "agent"
                          ? "Jump in manually without disabling AI mode."
                          : "Reply as a human representative."
                      }
                      className="w-full resize-none border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {activeConversation.mode === "agent"
                          ? "AI continues auto-replies on the next inbound message."
                          : "Auto-reply is paused until you switch back to AI mode."}
                      </p>
                      <button
                        type="button"
                        disabled={isSending || draft.trim().length === 0}
                        onClick={() => void handleSend()}
                        className="rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending ? "Sending..." : "Send message"}
                      </button>
                    </div>
                  </div>
                </footer>
              </>
            ) : (
              <div className="grid flex-1 place-items-center px-6 text-center text-slate-400">
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
                    Waiting for conversations
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6">
                    Verify the Meta webhook and send a DM to populate the dashboard.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>

        <section className="grid min-h-[72vh] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-panel backdrop-blur">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-white">
                Comment Threads
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Track post comments and AI/manual replies.
              </p>
            </div>

            <div className="scrollbar-thin max-h-[calc(72vh-5rem)] space-y-2 overflow-y-auto p-3">
              {commentThreads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-slate-400">
                  No comment threads yet. New comments will appear here.
                </div>
              ) : null}
              {commentThreads.map((thread) => {
                const isActive = thread.id === activeCommentThreadId;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveCommentThreadId(thread.id)}
                    className={`w-full rounded-[1.6rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-white/10 bg-white/[0.08] shadow-[inset_4px_0_0_0_rgba(251,113,133,1)]"
                        : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate font-medium text-white">
                            @{thread.commenter_username ?? thread.commenter_igsid ?? "unknown"}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${commentStatusClass(thread.status)}`}
                          >
                            {commentStatusLabel(thread.status)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-300">
                          {truncateText(thread.comment_text, 90)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {truncateText(thread.last_message, 80)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatRelativeTimestamp(thread.last_message_at ?? thread.updated_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-panel backdrop-blur">
            {activeCommentThread ? (
              <>
                <header className="border-b border-white/10 px-5 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
                        @{activeCommentThread.commenter_username ?? activeCommentThread.commenter_igsid ?? "unknown"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Comment ID: {activeCommentThread.comment_id}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {activeCommentThread.comment_text}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${commentStatusClass(activeCommentThread.status)}`}
                    >
                      {commentStatusLabel(activeCommentThread.status)}
                    </span>
                  </div>
                </header>

                <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-6">
                  {isLoadingCommentMessages ? (
                    <div className="text-sm text-slate-400">Loading comment thread...</div>
                  ) : null}

                  {!isLoadingCommentMessages && commentMessages.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
                      No messages recorded for this comment yet.
                    </div>
                  ) : null}

                  {commentMessages.map((message) => {
                    const isAssistant = message.role === "assistant";
                    const senderLabel =
                      message.source === "human"
                        ? "You"
                        : message.source === "agent"
                          ? "AI"
                          : "User";
                    const channelLabel = message.channel === "dm" ? "DM" : "Comment";

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-3 ${isAssistant ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[1.6rem] px-4 py-3 shadow-lg sm:max-w-[72%] ${
                            isAssistant
                              ? "bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500 text-white"
                              : "border border-white/10 bg-white/[0.04] text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                          <div className={`mt-2 flex items-center gap-2 text-[11px] ${isAssistant ? "text-white/80" : "text-slate-400"}`}>
                            <span>{channelLabel} | {senderLabel} |</span>
                            <span>{formatMessageTimestamp(message.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="border-t border-white/10 px-5 py-4">
                  <div className="rounded-[1.6rem] border border-white/10 bg-[#0b1120]/80 p-3">
                    <textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      rows={3}
                      placeholder="Write a manual public comment reply..."
                      className="w-full resize-none border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Sends a public reply and appends it to this comment thread.
                      </p>
                      <button
                        type="button"
                        disabled={isSendingCommentReply || commentDraft.trim().length === 0}
                        onClick={() => void handleSendCommentReply()}
                        className="rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSendingCommentReply ? "Sending..." : "Send comment reply"}
                      </button>
                    </div>
                  </div>
                </footer>
              </>
            ) : (
              <div className="grid flex-1 place-items-center px-6 text-center text-slate-400">
                <div>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
                    Waiting for comment threads
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6">
                    Subscribe to comments field in Instagram webhook and wait for new comments.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}













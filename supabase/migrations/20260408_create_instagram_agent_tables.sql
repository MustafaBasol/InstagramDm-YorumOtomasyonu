create extension if not exists pgcrypto;

create table if not exists public.instagram_conversations (
  id uuid default gen_random_uuid() primary key,
  igsid text unique not null,
  name text,
  username text,
  profile_pic text,
  follower_count integer,
  is_user_follow_business boolean,
  is_business_follow_user boolean,
  mode text not null default 'agent' check (mode in ('agent', 'human')),
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.instagram_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.instagram_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  source text not null default 'instagram' check (source in ('instagram', 'agent', 'human')),
  content text not null,
  instagram_msg_id text unique,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.instagram_comment_replies (
  id uuid default gen_random_uuid() primary key,
  comment_id text unique not null,
  media_id text,
  commenter_igsid text,
  commenter_username text,
  comment_text text not null,
  ai_response text,
  reply_comment_id text,
  status text not null default 'pending' check (status in ('pending', 'replied', 'failed')),
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  replied_at timestamp with time zone
);

create table if not exists public.instagram_comment_messages (
  id uuid default gen_random_uuid() primary key,
  comment_thread_id uuid references public.instagram_comment_replies(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  source text not null default 'instagram' check (source in ('instagram', 'agent', 'human')),
  channel text not null default 'comment' check (channel in ('comment', 'dm')),
  content text not null,
  instagram_comment_id text,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_instagram_messages_conversation
  on public.instagram_messages(conversation_id);

create index if not exists idx_instagram_conversations_updated
  on public.instagram_conversations(updated_at desc);

create index if not exists idx_instagram_comment_replies_created
  on public.instagram_comment_replies(created_at desc);

create index if not exists idx_instagram_comment_messages_thread
  on public.instagram_comment_messages(comment_thread_id);

alter table public.instagram_conversations enable row level security;
alter table public.instagram_messages enable row level security;
alter table public.instagram_comment_replies enable row level security;
alter table public.instagram_comment_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.instagram_conversations to anon, authenticated;
grant select on public.instagram_messages to anon, authenticated;
grant select on public.instagram_comment_replies to anon, authenticated;
grant select on public.instagram_comment_messages to anon, authenticated;

drop policy if exists "Public can read instagram_conversations" on public.instagram_conversations;
create policy "Public can read instagram_conversations"
  on public.instagram_conversations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read instagram_messages" on public.instagram_messages;
create policy "Public can read instagram_messages"
  on public.instagram_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read instagram_comment_replies" on public.instagram_comment_replies;
create policy "Public can read instagram_comment_replies"
  on public.instagram_comment_replies
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read instagram_comment_messages" on public.instagram_comment_messages;
create policy "Public can read instagram_comment_messages"
  on public.instagram_comment_messages
  for select
  to anon, authenticated
  using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.instagram_conversations'::regclass
  ) then
    execute 'alter publication supabase_realtime add table public.instagram_conversations';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.instagram_messages'::regclass
  ) then
    execute 'alter publication supabase_realtime add table public.instagram_messages';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.instagram_comment_replies'::regclass
  ) then
    execute 'alter publication supabase_realtime add table public.instagram_comment_replies';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.instagram_comment_messages'::regclass
  ) then
    execute 'alter publication supabase_realtime add table public.instagram_comment_messages';
  end if;
end
$$;

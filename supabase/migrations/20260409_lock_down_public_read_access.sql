revoke select on public.instagram_conversations from anon;
revoke select on public.instagram_messages from anon;
revoke select on public.instagram_comment_replies from anon;
revoke select on public.instagram_comment_messages from anon;

drop policy if exists "Public can read instagram_conversations" on public.instagram_conversations;
drop policy if exists "Public can read instagram_messages" on public.instagram_messages;
drop policy if exists "Public can read instagram_comment_replies" on public.instagram_comment_replies;
drop policy if exists "Public can read instagram_comment_messages" on public.instagram_comment_messages;

drop policy if exists "Authenticated can read instagram_conversations" on public.instagram_conversations;
create policy "Authenticated can read instagram_conversations"
  on public.instagram_conversations
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can read instagram_messages" on public.instagram_messages;
create policy "Authenticated can read instagram_messages"
  on public.instagram_messages
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can read instagram_comment_replies" on public.instagram_comment_replies;
create policy "Authenticated can read instagram_comment_replies"
  on public.instagram_comment_replies
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can read instagram_comment_messages" on public.instagram_comment_messages;
create policy "Authenticated can read instagram_comment_messages"
  on public.instagram_comment_messages
  for select
  to authenticated
  using (true);

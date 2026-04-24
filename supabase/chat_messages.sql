-- Chat log for OliverDock.
-- This app authenticates operators through Azure/MSAL, not Supabase Auth, so
-- chat history is accessed through the CF Pages Function /api/chat-messages
-- using the Supabase service role. Run once in Supabase SQL Editor.

create table if not exists public.chat_messages (
  id          bigserial primary key,
  user_id     text not null,
  -- page_label scopes logs per Oliver module (accounts, hr, sdr, …).
  page_label  text,
  role        text not null check (role in ('user', 'assistant')),
  text        text not null,
  kind        text not null default 'msg', -- msg | parse-result | write-prompt
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, page_label, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "deny client access" on public.chat_messages;
create policy "deny client access" on public.chat_messages
  for all
  using (false)
  with check (false);

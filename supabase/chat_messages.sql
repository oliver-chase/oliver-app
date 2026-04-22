-- Chat log for OliverDock. Same shape as Tesknota so both apps can reuse
-- the schema pattern. Run once in Supabase SQL Editor.

create table if not exists public.chat_messages (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- page_label lets us scope logs per Oliver module (accounts, hr, sdr, …)
  -- without mixing conversations across modules.
  page_label  text,
  role        text not null check (role in ('user', 'bot', 'assistant')),
  text        text not null,
  kind        text,                      -- msg | parse-result | write-prompt (optional)
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, page_label, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select_own on public.chat_messages;
create policy chat_messages_select_own
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists chat_messages_delete_own on public.chat_messages;
create policy chat_messages_delete_own
  on public.chat_messages for delete
  using (auth.uid() = user_id);

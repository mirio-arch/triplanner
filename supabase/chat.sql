-- Triplanner: gezi sohbeti. Supabase'te SQL Editor'de bir kez çalıştır.
-- Tekrar çalıştırmak zararsızdır.

create table if not exists public.trip_messages (
  id          uuid primary key default gen_random_uuid(),
  trip_id     text not null references public.trips(id) on delete cascade,
  author      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '' check (char_length(author_name) <= 40),
  body        text not null default '' check (char_length(body) <= 2000),
  refs        jsonb not null default '[]'::jsonb check (jsonb_typeof(refs) = 'array' and jsonb_array_length(refs) <= 6),
  created_at  timestamptz not null default now(),
  check (char_length(body) > 0 or jsonb_array_length(refs) > 0)
);
create index if not exists trip_messages_trip_time on public.trip_messages (trip_id, created_at desc);

alter table public.trip_messages enable row level security;
revoke all on public.trip_messages from anon;
revoke insert, update on public.trip_messages from authenticated;
grant select, delete on public.trip_messages to authenticated;
grant insert (trip_id, author_name, body, refs) on public.trip_messages to authenticated;

-- Gezinin sahibi ve eklenen kişiler okur ve yazar; herkes yalnızca kendi mesajını siler.
drop policy if exists msg_select on public.trip_messages;
drop policy if exists msg_insert on public.trip_messages;
drop policy if exists msg_delete on public.trip_messages;
create policy msg_select on public.trip_messages for select to authenticated
  using (public.owns_trip(trip_id) or public.is_trip_member(trip_id));
create policy msg_insert on public.trip_messages for insert to authenticated
  with check (author = auth.uid() and (public.owns_trip(trip_id) or public.is_trip_member(trip_id)));
create policy msg_delete on public.trip_messages for delete to authenticated
  using (author = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.trip_messages;
exception when duplicate_object then null; end $$;

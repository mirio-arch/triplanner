-- Triplanner: davet linki
-- Supabase panelinde SQL Editor'ü aç, bu dosyanın tamamını yapıştır ve Run'a bas.
-- Tekrar çalıştırmak zararsızdır. (Aynı kod schema.sql'in sonunda da var.)

create table if not exists public.trip_invites (
  token      text primary key check (token ~ '^[A-Za-z0-9]{20,64}$'),
  trip_id    text not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index if not exists trip_invites_trip on public.trip_invites (trip_id);

alter table public.trip_invites enable row level security;
revoke all on public.trip_invites from anon;
revoke insert, update on public.trip_invites from authenticated;
grant select, delete on public.trip_invites to authenticated;
grant insert (token, trip_id) on public.trip_invites to authenticated;

-- Linki yalnızca gezinin sahibi oluşturur, görür ve iptal eder.
drop policy if exists inv_select on public.trip_invites;
drop policy if exists inv_insert on public.trip_invites;
drop policy if exists inv_delete on public.trip_invites;
create policy inv_select on public.trip_invites for select to authenticated
  using (public.owns_trip(trip_id));
create policy inv_insert on public.trip_invites for insert to authenticated
  with check (public.owns_trip(trip_id) and created_by = auth.uid());
create policy inv_delete on public.trip_invites for delete to authenticated
  using (public.owns_trip(trip_id));

-- Linke dokunan kişi giriş yapınca kendi e-postasıyla geziye eklenir.
-- Tabloyu göremez; yalnızca bu fonksiyonla, geçerli ve süresi dolmamış bir linkle katılır.
create or replace function public.join_trip(tok text) returns text
language plpgsql security definer set search_path = public as $$
declare tid text; me text := public.my_email();
begin
  if auth.uid() is null or me = '' then return null; end if;
  if tok is null or tok !~ '^[A-Za-z0-9]{20,64}$' then return null; end if;
  select trip_id into tid from public.trip_invites where token = tok and expires_at > now();
  if tid is null then return null; end if;
  if exists (select 1 from public.trips where id = tid and owner = auth.uid()) then return tid; end if;
  insert into public.trip_members (trip_id, email) values (tid, me) on conflict do nothing;
  return tid;
end $$;
revoke execute on function public.join_trip(text) from anon, public;
grant execute on function public.join_trip(text) to authenticated;

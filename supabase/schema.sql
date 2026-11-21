-- Triplanner veritabanı kurulumu.
-- Supabase panelinde SQL Editor'ü aç, bu dosyanın tamamını yapıştır ve Run'a bas.
-- Tekrar çalıştırmak zararsızdır.

-- 1) Tablolar ------------------------------------------------------------
create table if not exists public.trips (
  id          text primary key check (id ~ '^[A-Za-z0-9]{1,40}$'),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  data        jsonb not null,
  sort        int  not null default 999,
  updated_at  timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id  text not null references public.trips(id) on delete cascade,
  email    text not null check (email = lower(email) and email like '%_@_%'),
  added_at timestamptz not null default now(),
  primary key (trip_id, email)
);

-- 2) Yardımcı fonksiyonlar ----------------------------------------------
create or replace function public.my_email() returns text
language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.owns_trip(tid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = tid and owner = auth.uid())
$$;

create or replace function public.is_trip_member(tid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = tid and email = public.my_email())
$$;

-- 3) Erişim kuralları ----------------------------------------------------
-- Gezi: sahibi ve eklenen kişiler görür ve düzenler; yalnızca sahibi siler.
alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;

revoke all on public.trips, public.trip_members from anon;
revoke insert, update on public.trips from authenticated;
grant select, delete on public.trips to authenticated;
grant insert (id, data, sort, updated_at) on public.trips to authenticated;
grant update (data, sort, updated_at)     on public.trips to authenticated;
grant select, insert, delete on public.trip_members to authenticated;
grant usage on schema public to authenticated;
grant execute on function public.my_email(), public.owns_trip(text), public.is_trip_member(text) to authenticated;
revoke execute on function public.owns_trip(text), public.is_trip_member(text) from anon, public;

drop policy if exists trips_select on public.trips;
drop policy if exists trips_insert on public.trips;
drop policy if exists trips_update on public.trips;
drop policy if exists trips_delete on public.trips;
create policy trips_select on public.trips for select to authenticated
  using (owner = auth.uid() or public.is_trip_member(id));
create policy trips_insert on public.trips for insert to authenticated
  with check (owner = auth.uid());
create policy trips_update on public.trips for update to authenticated
  using (owner = auth.uid() or public.is_trip_member(id))
  with check (owner = auth.uid() or public.is_trip_member(id));
create policy trips_delete on public.trips for delete to authenticated
  using (owner = auth.uid());

-- Paylaşım listesi: gezinin sahibi ekler/çıkarır; kişi kendini çıkarabilir.
drop policy if exists members_select on public.trip_members;
drop policy if exists members_insert on public.trip_members;
drop policy if exists members_delete on public.trip_members;
create policy members_select on public.trip_members for select to authenticated
  using (public.owns_trip(trip_id) or public.is_trip_member(trip_id));
create policy members_insert on public.trip_members for insert to authenticated
  with check (public.owns_trip(trip_id));
create policy members_delete on public.trip_members for delete to authenticated
  using (public.owns_trip(trip_id) or email = public.my_email());

-- 4) Canlı güncelleme ---------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.trip_members;
exception when duplicate_object then null; end $$;

-- 5) Fotoğraf deposu (özel; yalnızca giriş yapanlar okur) ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

drop policy if exists triplanner_photos_read   on storage.objects;
drop policy if exists triplanner_photos_upload on storage.objects;
create policy triplanner_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'photos');
create policy triplanner_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');

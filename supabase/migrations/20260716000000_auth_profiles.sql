-- Profiles: one row per auth user, created by trigger on signup.
-- username/display_name stay NULL until onboarding completes.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique
    check (username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' and char_length(username) <= 48),
  display_name text check (char_length(display_name) between 1 and 64),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reserved usernames = app routes. Enforced here so no app path can bypass it.
create table public.reserved_usernames (
  name text primary key
);

insert into public.reserved_usernames (name) values
  ('login'), ('signup'), ('logout'), ('onboarding'), ('settings'), ('api'),
  ('coach'), ('athlete'), ('athletes'), ('admin'), ('dashboard'), ('auth'),
  ('app'), ('account'), ('profile'), ('help'), ('support'), ('docs'),
  ('about'), ('pricing'), ('terms'), ('privacy'), ('new'), ('home'),
  ('tensor'), ('team'), ('teams'), ('workout'), ('workouts'), ('plan'),
  ('plans'), ('exercise'), ('exercises'), ('invite'), ('invites');

create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.reserved_usernames r where r.name = candidate);
$$;

alter table public.profiles
  add constraint username_not_reserved
  check (not public.username_is_reserved(username));

-- Availability check for onboarding (security definer: RLS hides other rows).
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.username_is_reserved(candidate)
     and not exists (select 1 from public.profiles p where p.username = candidate);
$$;

-- Create profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Grants (RLS still filters rows).
grant select, update (username, display_name, avatar_url) on public.profiles to authenticated;
grant select on public.reserved_usernames to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.username_is_reserved(text) to anon, authenticated;

-- RLS: owner-only. No public profiles in this phase.
alter table public.profiles enable row level security;
alter table public.reserved_usernames enable row level security;

create policy "own profile read" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "own profile update" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "reserved readable" on public.reserved_usernames
  for select using (true);

-- Avatars bucket: public read, owner-scoped writes under {uid}/.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "avatar upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatar update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatar delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

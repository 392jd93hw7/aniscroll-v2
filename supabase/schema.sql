-- Run in the Supabase SQL editor before enabling cloud features.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kaito',
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member','admin'));

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  anilist_id integer not null,
  anime_title text not null,
  cover_image text,
  status text not null default 'Plan to Watch'
    check (status in ('Currently Watching','Completed','Plan to Watch','On Hold','Dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, anilist_id)
);
create table if not exists public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  anilist_id integer not null,
  season_number integer not null default 1 check (season_number > 0),
  episode_number integer not null default 1 check (episode_number > 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, anilist_id, season_number)
);
create table if not exists public.anime_overrides (
  anilist_id integer primary key check (anilist_id > 0),
  title_override text,
  cover_url text,
  banner_url text,
  synopsis_override text,
  featured boolean not null default false,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Kaito'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.watch_progress enable row level security;
alter table public.anime_overrides enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
for select using (auth.uid() = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage their own watchlist" on public.watchlist;
create policy "Users manage their own watchlist" on public.watchlist
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own viewing progress" on public.watch_progress;
create policy "Users manage their own viewing progress" on public.watch_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Read visible anime overrides" on public.anime_overrides;
create policy "Read visible anime overrides" on public.anime_overrides
for select using (
  hidden = false OR exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
drop policy if exists "Admins insert anime overrides" on public.anime_overrides;
create policy "Admins insert anime overrides" on public.anime_overrides
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "Admins update anime overrides" on public.anime_overrides;
create policy "Admins update anime overrides" on public.anime_overrides
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "Admins delete anime overrides" on public.anime_overrides;
create policy "Admins delete anime overrides" on public.anime_overrides
for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Users may change their display name, never their own admin role.
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
grant select on public.profiles, public.anime_overrides to anon, authenticated;
grant select, insert, update, delete on public.watchlist, public.watch_progress to authenticated;
grant insert, update, delete on public.anime_overrides to authenticated;

create index if not exists watchlist_user_created_idx on public.watchlist(user_id, created_at desc);
create index if not exists watch_progress_user_updated_idx on public.watch_progress(user_id, updated_at desc);

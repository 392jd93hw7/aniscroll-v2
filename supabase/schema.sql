-- Run in the Supabase SQL editor before enabling cloud watchlists.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kaito',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
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
alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.watch_progress enable row level security;
create policy "Users can read their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage their own watchlist" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own viewing progress" on public.watch_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists watchlist_user_created_idx on public.watchlist(user_id, created_at desc);
create index if not exists watch_progress_user_updated_idx on public.watch_progress(user_id, updated_at desc);

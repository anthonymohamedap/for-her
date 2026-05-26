-- ============================================
-- Our Little Garden — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- Daily memory entries
create table if not exists memories (
  id uuid default gen_random_uuid() primary key,
  identity text not null check (identity in ('anthony', 'yeon')),
  date date not null,
  photo_url text not null,
  caption text check (length(caption) <= 100),
  created_at timestamptz default now(),
  unique(identity, date)
);

-- Enable RLS
alter table memories enable row level security;

-- Allow anyone with anon key to read
create policy "Public read memories"
  on memories for select
  using (true);

-- Allow anyone with anon key to insert
create policy "Public insert memories"
  on memories for insert
  with check (true);

-- Allow upsert (update own entry)
create policy "Public update memories"
  on memories for update
  using (true);

-- Streak tracking table
create table if not exists streaks (
  id uuid default gen_random_uuid() primary key,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_shared_date date,
  updated_at timestamptz default now()
);

alter table streaks enable row level security;

create policy "Public read streaks"
  on streaks for select
  using (true);

create policy "Public insert streaks"
  on streaks for insert
  with check (true);

create policy "Public update streaks"
  on streaks for update
  using (true);

-- ============================================
-- Storage Bucket Setup
-- Run separately in Supabase Dashboard > Storage
-- Or use the Supabase CLI
-- ============================================
-- 1. Create bucket named: memory-photos
-- 2. Set it to PUBLIC
-- 3. Add storage policy:
--    Name: "Public upload"
--    Operation: INSERT
--    Policy: (bucket_id = 'memory-photos')
--
-- Or run this:
-- insert into storage.buckets (id, name, public)
--   values ('memory-photos', 'memory-photos', true)
--   on conflict (id) do nothing;
--
-- create policy "Public upload memory-photos"
--   on storage.objects for insert
--   with check (bucket_id = 'memory-photos');
--
-- create policy "Public read memory-photos"
--   on storage.objects for select
--   using (bucket_id = 'memory-photos');

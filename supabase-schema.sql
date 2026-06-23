-- ============================================================
-- ActiveHikes Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- BANK ACCOUNTS (payment info shown to users)
-- ============================================================
create table public.bank_accounts (
  id uuid default uuid_generate_v4() primary key,
  bank_name text not null,
  account_holder text not null,
  iban text not null,
  currency text not null default 'RON',
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.bank_accounts enable row level security;

create policy "Anyone can view active bank accounts" on public.bank_accounts
  for select using (is_active = true);

create policy "Admins can manage bank accounts" on public.bank_accounts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- HIKES
-- ============================================================
create table public.hikes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  destination text not null,
  description text,
  date date not null,
  entry_fee numeric(10,2) not null default 0,
  max_participants int not null,
  starting_point text,
  duration_hours numeric(4,1),
  has_camping boolean default false,
  has_accommodation boolean default false,
  accommodation_details text,
  meeting_time time,
  difficulty text check (difficulty in ('easy', 'moderate', 'hard', 'expert')),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
  gpx_approximate_url text,   -- GPX uploaded before the hike (approximate route)
  gpx_actual_url text,        -- GPX uploaded after the hike (actual route)
  external_photos_url text,   -- Link to Google Photos / external album
  cover_image_url text,       -- Main cover photo
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.hikes enable row level security;

create policy "Anyone can view hikes" on public.hikes
  for select using (true);

create policy "Admins can manage hikes" on public.hikes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- HIKE PARTICIPANTS
-- ============================================================
create table public.hike_participants (
  id uuid default uuid_generate_v4() primary key,
  hike_id uuid references public.hikes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'waitlist')),
  joined_at timestamptz default now(),
  confirmed_at timestamptz,
  admin_notes text,
  unique(hike_id, user_id)
);

alter table public.hike_participants enable row level security;

create policy "Users can view their own participations" on public.hike_participants
  for select using (auth.uid() = user_id);

create policy "Admins can view all participations" on public.hike_participants
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can join hikes" on public.hike_participants
  for insert with check (auth.uid() = user_id);

create policy "Users can cancel their own participation" on public.hike_participants
  for delete using (auth.uid() = user_id);

create policy "Admins can update participations" on public.hike_participants
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- HIKE PHOTOS (featured photos shown on the site)
-- ============================================================
create table public.hike_photos (
  id uuid default uuid_generate_v4() primary key,
  hike_id uuid references public.hikes(id) on delete cascade not null,
  url text not null,
  caption text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.hike_photos enable row level security;

create policy "Anyone can view hike photos" on public.hike_photos
  for select using (true);

create policy "Admins can manage hike photos" on public.hike_photos
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- STORAGE BUCKETS (run these separately in Supabase dashboard
-- or via the storage API)
-- ============================================================
-- Bucket: hike-photos   (public)
-- Bucket: hike-gpx      (public)
-- Bucket: hike-covers   (public)

-- ============================================================
-- HELPER FUNCTION: get participant counts for a hike
-- ============================================================
create or replace function public.get_hike_counts(hike_uuid uuid)
returns table(confirmed_count int, pending_count int, waitlist_count int) as $$
  select
    count(*) filter (where status = 'confirmed')::int,
    count(*) filter (where status = 'pending')::int,
    count(*) filter (where status = 'waitlist')::int
  from public.hike_participants
  where hike_id = hike_uuid;
$$ language sql security definer;

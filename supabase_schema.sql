-- Enable RLS (Row Level Security) for security
-- Users are managed by Supabase Auth (auth.users)
-- We create a public profile table to sync basic info (Optional, but good practice)

-- 1. Create Profiles Table (Syncs with auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Create Memory Items Table
create table public.memory_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  text text not null,
  translation text,
  context text default 'General',
  stage int default 0,
  next_review_at bigint, -- Storing as timestamp (ms) to match JS Date.now()
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Memory Items
alter table public.memory_items enable row level security;
create policy "Users can view their own memory items." on public.memory_items
  for select using (auth.uid() = user_id);
create policy "Users can insert their own memory items." on public.memory_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own memory items." on public.memory_items
  for update using (auth.uid() = user_id);
create policy "Users can delete their own memory items." on public.memory_items
  for delete using (auth.uid() = user_id);

-- 3. Create Culture Items Table (User Custom)
create table public.culture_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  zh text not null,
  en text not null,
  "desc" text,
  detail text,
  image_url text,
  examples jsonb, -- Store array of objects as JSONB
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Culture Items
alter table public.culture_items enable row level security;
create policy "Users can view their own culture items." on public.culture_items
  for select using (auth.uid() = user_id);
create policy "Users can insert their own culture items." on public.culture_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own culture items." on public.culture_items
  for update using (auth.uid() = user_id);
create policy "Users can delete their own culture items." on public.culture_items
  for delete using (auth.uid() = user_id);

-- 4. Create Trending Slangs Table (User Custom)
create table public.trending_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  zh text not null,
  pinyin text,
  en text not null,
  "desc" text,
  "usage" text,
  example jsonb, -- Store single object as JSONB
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Trending Items
alter table public.trending_items enable row level security;
create policy "Users can view their own trending items." on public.trending_items
  for select using (auth.uid() = user_id);
create policy "Users can insert their own trending items." on public.trending_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own trending items." on public.trending_items
  for update using (auth.uid() = user_id);
create policy "Users can delete their own trending items." on public.trending_items
  for delete using (auth.uid() = user_id);

-- Function to handle new user signup (Optional: Auto-create profile)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

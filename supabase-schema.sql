create table if not exists public.fintracker_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"months":{},"categories":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fintracker_data enable row level security;

drop policy if exists "Users can read their own FinTracker data" on public.fintracker_data;
create policy "Users can read their own FinTracker data"
  on public.fintracker_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own FinTracker data" on public.fintracker_data;
create policy "Users can insert their own FinTracker data"
  on public.fintracker_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own FinTracker data" on public.fintracker_data;
create policy "Users can update their own FinTracker data"
  on public.fintracker_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

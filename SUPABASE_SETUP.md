# Pulse CRM — Supabase Setup

This guide explains how to run the dashboard in “real mode” against Supabase instead of the local demo store.

## 1. Create/Configure Your Supabase Project

1. Sign in at https://supabase.com/ and create a project (the free tier works).
2. In **Project Settings → API**, copy the following values:
   - `Project URL`
   - `anon public` API key (client key)
3. In **Project Settings → Database**, copy the `Connection string` (URI) for Postgres. You will need it only if you want to run migrations via Drizzle.

## 2. Run the SQL to Create Tables & Realtime Publications

Open *SQL Editor* in Supabase and run the script below once. It will create the tables used by the app, enable Row Level Security (RLS), create permissive policies for anonymous access, and register the tables with the realtime publication.

```sql
-- Extensions required by Supabase for UUID generation
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  state text not null default 'To Do',
  priority text not null default 'Media',
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  deal_id uuid,
  contact_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deals table
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  amount numeric,
  stage text not null default 'Prospección',
  probability integer default 0,
  target_close_date timestamptz,
  next_step text,
  status text not null default 'Open',
  score integer default 0,
  priority text default 'Cold',
  risk_level text default 'Bajo',
  last_activity timestamptz,
  inactivity_days integer default 0,
  contact_id uuid,
  owner_id uuid,
  close_reason text,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contacts table
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  company_id uuid references public.companies(id),
  source text,
  score integer default 0,
  priority text default 'Cold',
  last_activity timestamptz,
  owner_id uuid,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Companies table (used by contact/company UI helpers)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  size text,
  revenue_estimate numeric,
  location text,
  website text,
  description text,
  score integer default 0,
  priority text default 'Cold',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Timeline entries (recent activity)
create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  description text not null,
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid,
  metadata text,
  created_at timestamptz not null default now()
);

-- Basic indexes
create index if not exists tasks_inserted_idx on public.tasks (inserted_at desc);
create index if not exists deals_updated_idx on public.deals (updated_at desc);
create index if not exists contacts_inserted_idx on public.contacts (inserted_at desc);
create index if not exists timeline_entries_created_idx on public.timeline_entries (created_at desc);

-- Helper views used by the dashboard
create or replace view public.deals_hot_v1 as
select
  d.*,
  coalesce(d.amount, 0)::numeric * (coalesce(d.probability, 0)::numeric / 100) as hot_score
from public.deals d
where d.status = 'Open';

create or replace view public.deals_stalled_v1 as
select
  d.*,
  coalesce(
    d.inactivity_days,
    greatest(
      coalesce(date_part('day', now() - d.last_activity), 0),
      0
    )
  ) as inactivity
from public.deals d
where d.status = 'Open'
  and (
    d.next_step is null
    or trim(d.next_step) = ''
    or (d.target_close_date is not null and d.target_close_date < now())
    or coalesce(d.inactivity_days, 0) >= 7
  );

-- Enable Row Level Security and allow anon CRUD operations
alter table public.tasks enable row level security;
alter table public.deals enable row level security;
alter table public.contacts enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.companies enable row level security;

create policy "Anon read tasks" on public.tasks for select using (true);
create policy "Anon insert tasks" on public.tasks for insert with check (true);
create policy "Anon update tasks" on public.tasks for update using (true);
create policy "Anon delete tasks" on public.tasks for delete using (true);

create policy "Anon read deals" on public.deals for select using (true);
create policy "Anon insert deals" on public.deals for insert with check (true);
create policy "Anon update deals" on public.deals for update using (true);
create policy "Anon delete deals" on public.deals for delete using (true);

create policy "Anon read contacts" on public.contacts for select using (true);
create policy "Anon insert contacts" on public.contacts for insert with check (true);
create policy "Anon update contacts" on public.contacts for update using (true);
create policy "Anon delete contacts" on public.contacts for delete using (true);

create policy "Anon read timeline" on public.timeline_entries for select using (true);
create policy "Anon insert timeline" on public.timeline_entries for insert with check (true);

create policy "Anon read companies" on public.companies for select using (true);
create policy "Anon insert companies" on public.companies for insert with check (true);
create policy "Anon update companies" on public.companies for update using (true);
create policy "Anon delete companies" on public.companies for delete using (true);

-- Register tables with realtime (so subscribeToChanges works)
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.contacts;
alter publication supabase_realtime add table public.timeline_entries;
alter publication supabase_realtime add table public.companies;

-- Optional trigger to keep updated_at fresh on deals and tasks
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_touch_updated
before update on public.tasks
for each row execute function public.touch_updated_at();

create trigger deals_touch_updated
before update on public.deals
for each row execute function public.touch_updated_at();
```

If you already had legacy tables, run this alignment script so the new fields exist and defaults are set:

```sql
alter table public.tasks add column if not exists created_at timestamptz default now();
alter table public.tasks alter column updated_at set default now();

alter table public.deals add column if not exists created_at timestamptz default now();
alter table public.deals alter column updated_at set default now();

alter table public.contacts add column if not exists created_at timestamptz default now();
alter table public.contacts alter column updated_at set default now();
alter table public.contacts add column if not exists company_id uuid references public.companies(id);

alter table public.companies add column if not exists created_at timestamptz default now();
alter table public.companies add column if not exists updated_at timestamptz default now();
```

> **Note:** These policies allow anonymous clients to read/write everything. For production you’ll want to tighten them or use Supabase Auth.

## 3. Configure Environment Variables Locally

1. Duplicate `.env.example` into `.env` (already present in the repo).
2. Paste your Supabase `Project URL` into `VITE_SUPABASE_URL`.
3. Paste the `anon public` key into `VITE_SUPABASE_ANON_KEY`.
4. Restart the dev server so Vite picks up the new env values.

```bash
npm install
npm run dev
```

When the env vars are present the dashboard automatically switches to Supabase mode (`IS_SUPABASE_MODE === true`). The “Inyectar demo” button disappears and all CRUD operations go against Supabase.

## 4. Verify the Integration

1. Open the dashboard at http://localhost:5173/ (or the port Vite prints).
2. Add/complete tasks, deals, and contacts.
3. Watch the Supabase tables update in real time (SQL Editor > Tables).
4. Open two browser windows: updates in one should stream into the other thanks to realtime subscriptions.

If you ever want to go back to demo mode, remove or comment out the Supabase variables and restart the dev server.

Happy building!

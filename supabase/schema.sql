create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ndis_number text not null,
  plan_type text not null,
  emergency_contact text not null,
  support_needs text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null,
  availability text not null,
  qualifications text not null,
  compliance_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_invitations (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  worker_email text not null,
  invite_token text not null unique,
  portal_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  support_worker_name text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'Draft',
  created_at timestamptz not null default now()
);

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  worker_name text not null,
  note text not null,
  is_important boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  worker_name text not null,
  priority text not null,
  summary text not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;
alter table public.support_workers enable row level security;
alter table public.worker_invitations enable row level security;
alter table public.shifts enable row level security;
alter table public.progress_notes enable row level security;
alter table public.incident_reports enable row level security;

create policy "Authenticated users can manage participants"
on public.participants for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage support workers"
on public.support_workers for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage worker invitations"
on public.worker_invitations for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage shifts"
on public.shifts for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage progress notes"
on public.progress_notes for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage incident reports"
on public.incident_reports for all
to authenticated
using (true)
with check (true);

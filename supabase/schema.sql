create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ndis_number text not null,
  plan_type text not null,
  emergency_contact text not null,
  support_needs text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organisation text,
  role text not null default 'support_worker' check (role in ('admin', 'support_worker')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists active boolean not null default true;

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

alter table public.support_workers
add column if not exists email text;

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

alter table public.shifts
add column if not exists support_worker_email text;

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  worker_name text not null,
  worker_email text,
  note text not null,
  is_important boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.progress_notes
add column if not exists category text;

alter table public.progress_notes
add column if not exists worker_email text;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  worker_name text not null,
  worker_email text,
  priority text not null,
  summary text not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

alter table public.incident_reports
add column if not exists worker_email text;

create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  title text not null,
  details text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;
alter table public.profiles enable row level security;
alter table public.support_workers enable row level security;
alter table public.worker_invitations enable row level security;
alter table public.shifts enable row level security;
alter table public.progress_notes enable row level security;
alter table public.incident_reports enable row level security;
alter table public.module_records enable row level security;

drop policy if exists "Authenticated users can manage participants" on public.participants;
drop policy if exists "Authenticated users can manage support workers" on public.support_workers;
drop policy if exists "Authenticated users can manage worker invitations" on public.worker_invitations;
drop policy if exists "Authenticated users can manage shifts" on public.shifts;
drop policy if exists "Authenticated users can manage progress notes" on public.progress_notes;
drop policy if exists "Authenticated users can manage incident reports" on public.incident_reports;
drop policy if exists "Authenticated users can manage module records" on public.module_records;
drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins can manage participants" on public.participants;
drop policy if exists "Admins can manage support workers" on public.support_workers;
drop policy if exists "Admins can manage worker invitations" on public.worker_invitations;
drop policy if exists "Admins can manage shifts" on public.shifts;
drop policy if exists "Workers can read assigned shifts" on public.shifts;
drop policy if exists "Role based progress notes" on public.progress_notes;
drop policy if exists "Role based incident reports" on public.incident_reports;
drop policy if exists "Role based module records" on public.module_records;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    (select role from public.profiles where id = auth.uid()),
    'support_worker'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'provider_admin');
$$;

create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage participants"
on public.participants for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage support workers"
on public.support_workers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage worker invitations"
on public.worker_invitations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage shifts"
on public.shifts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read assigned shifts"
on public.shifts for select
to authenticated
using (public.is_admin() or lower(support_worker_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Role based progress notes"
on public.progress_notes for all
to authenticated
using (public.is_admin() or lower(worker_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
with check (public.is_admin() or lower(worker_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Role based incident reports"
on public.incident_reports for all
to authenticated
using (public.is_admin() or lower(worker_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
with check (public.is_admin() or lower(worker_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Role based module records"
on public.module_records for all
to authenticated
using (public.is_admin() or (public.current_app_role() = 'support_worker' and module in ('notes', 'incidents')))
with check (public.is_admin() or (public.current_app_role() = 'support_worker' and module in ('notes', 'incidents')));

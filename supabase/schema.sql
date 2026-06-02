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
  role text not null default 'support_worker' check (role in ('admin', 'support_worker', 'team_leader')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists active boolean not null default true;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('admin', 'support_worker', 'team_leader'));

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
  support_worker_email text,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'Draft',
  approval_status text not null default 'not_submitted',
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  clocked_by uuid references auth.users(id) on delete set null,
  clocked_by_email text,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_by_email text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_email text,
  rejection_reason text,
  payroll_ready_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.shifts
add column if not exists support_worker_email text;

alter table public.shifts
add column if not exists approval_status text not null default 'not_submitted';

alter table public.shifts
add column if not exists clock_in_at timestamptz;

alter table public.shifts
add column if not exists clock_out_at timestamptz;

alter table public.shifts
add column if not exists clocked_by uuid references auth.users(id) on delete set null;

alter table public.shifts
add column if not exists clocked_by_email text;

alter table public.shifts
add column if not exists submitted_at timestamptz;

alter table public.shifts
add column if not exists submitted_by uuid references auth.users(id) on delete set null;

alter table public.shifts
add column if not exists submitted_by_email text;

alter table public.shifts
add column if not exists approved_at timestamptz;

alter table public.shifts
add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.shifts
add column if not exists approved_by_email text;

alter table public.shifts
add column if not exists rejection_reason text;

alter table public.shifts
add column if not exists payroll_ready_at timestamptz;

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

alter table public.progress_notes
add column if not exists service_date date;

alter table public.progress_notes
add column if not exists start_time time;

alter table public.progress_notes
add column if not exists end_time time;

alter table public.progress_notes
add column if not exists outcomes text;

alter table public.progress_notes
add column if not exists digital_signature text;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  incident_number text unique,
  participant_name text not null,
  worker_name text not null,
  worker_email text,
  staff_involved text,
  priority text not null,
  severity text,
  incident_date date,
  incident_time time,
  location text,
  summary text not null,
  investigation_notes text,
  attachment_names text[] not null default '{}'::text[],
  attachment_paths text[] not null default '{}'::text[],
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incident_reports
add column if not exists worker_email text;

alter table public.incident_reports
add column if not exists incident_number text;

alter table public.incident_reports
add column if not exists staff_involved text;

alter table public.incident_reports
add column if not exists severity text;

alter table public.incident_reports
add column if not exists incident_date date;

alter table public.incident_reports
add column if not exists incident_time time;

alter table public.incident_reports
add column if not exists location text;

alter table public.incident_reports
add column if not exists investigation_notes text;

alter table public.incident_reports
add column if not exists attachment_names text[] not null default '{}'::text[];

alter table public.incident_reports
add column if not exists attachment_paths text[] not null default '{}'::text[];

alter table public.incident_reports
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists incident_reports_incident_number_key
on public.incident_reports (incident_number)
where incident_number is not null;

create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  title text not null,
  details text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.care_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  participant_name text,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  storage_bucket text not null default 'care-documents',
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  user_role text,
  action text not null,
  table_name text,
  record_id text,
  record_label text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  storage_bucket text not null default 'database-backups',
  storage_path text,
  file_name text,
  size_bytes bigint,
  table_counts jsonb not null default '{}'::jsonb,
  started_by text,
  error_message text
);

alter table public.participants enable row level security;
alter table public.profiles enable row level security;
alter table public.support_workers enable row level security;
alter table public.worker_invitations enable row level security;
alter table public.shifts enable row level security;
alter table public.progress_notes enable row level security;
alter table public.incident_reports enable row level security;
alter table public.module_records enable row level security;
alter table public.care_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backup_logs enable row level security;

alter table public.participants force row level security;
alter table public.profiles force row level security;
alter table public.support_workers force row level security;
alter table public.worker_invitations force row level security;
alter table public.shifts force row level security;
alter table public.progress_notes force row level security;
alter table public.incident_reports force row level security;
alter table public.module_records force row level security;
alter table public.care_documents force row level security;
alter table public.audit_logs force row level security;
alter table public.backup_logs force row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'care-documents',
  'care-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-attachments',
  'incident-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'database-backups',
  'database-backups',
  false,
  104857600,
  array['application/json']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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
drop policy if exists "Workers can read assigned participants" on public.participants;
drop policy if exists "Admins can manage support workers" on public.support_workers;
drop policy if exists "Workers can read own support worker record" on public.support_workers;
drop policy if exists "Admins can manage worker invitations" on public.worker_invitations;
drop policy if exists "Admins can manage shifts" on public.shifts;
drop policy if exists "Workers can read assigned shifts" on public.shifts;
drop policy if exists "Role based progress notes" on public.progress_notes;
drop policy if exists "Admins can manage progress notes" on public.progress_notes;
drop policy if exists "Workers can read own progress notes" on public.progress_notes;
drop policy if exists "Workers can create own assigned progress notes" on public.progress_notes;
drop policy if exists "Workers can update own progress notes" on public.progress_notes;
drop policy if exists "Role based incident reports" on public.incident_reports;
drop policy if exists "Admins can manage incident reports" on public.incident_reports;
drop policy if exists "Workers can read own incident reports" on public.incident_reports;
drop policy if exists "Workers can create own assigned incident reports" on public.incident_reports;
drop policy if exists "Workers can update own incident reports" on public.incident_reports;
drop policy if exists "Role based module records" on public.module_records;
drop policy if exists "Admins can manage module records" on public.module_records;
drop policy if exists "Admins can manage care documents" on public.care_documents;
drop policy if exists "Workers can read assigned care documents" on public.care_documents;
drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Users can create own audit logs" on public.audit_logs;
drop policy if exists "Admins can read backup logs" on public.backup_logs;
drop policy if exists "Admins can manage backup logs" on public.backup_logs;
drop policy if exists "No public storage access to care documents" on storage.objects;
drop policy if exists "No public storage access to incident attachments" on storage.objects;
drop policy if exists "No public storage access to database backups" on storage.objects;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case when lower(coalesce(auth.jwt() ->> 'email', '')) = 'sanjee@live.com' then 'admin' end,
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    (select role from public.profiles where id = auth.uid() and active = true),
    'support_worker'
  );
$$;

create or replace function public.current_app_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select active from public.profiles where id = auth.uid()),
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sanjee@live.com'
  );
$$;

create or replace function public.worker_is_assigned_to_participant(participant text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shifts
    where lower(shifts.support_worker_email) = public.current_app_email()
      and shifts.participant_name = participant
  );
$$;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = 'sanjee@live.com';

insert into public.profiles (id, email, full_name, organisation, role, active)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email), coalesce(raw_user_meta_data ->> 'organisation', ''), 'admin', true
from auth.users
where lower(email) = 'sanjee@live.com'
on conflict (id) do update
set role = 'admin',
    active = true,
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active() and public.current_app_role() in ('admin', 'provider_admin');
$$;

create or replace function public.is_support_worker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active() and public.current_app_role() = 'support_worker';
$$;

create or replace function public.is_team_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active()
    and public.current_app_role() in ('admin', 'team_leader');
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

create policy "Workers can read assigned participants"
on public.participants for select
to authenticated
using (
  public.is_support_worker()
  and exists (
    select 1
    from public.shifts
    where shifts.participant_name = participants.name
      and lower(shifts.support_worker_email) = public.current_app_email()
  )
);

create policy "Admins can manage support workers"
on public.support_workers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read own support worker record"
on public.support_workers for select
to authenticated
using (
  public.is_support_worker()
  and lower(email) = public.current_app_email()
);

create policy "Admins can manage worker invitations"
on public.worker_invitations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage shifts"
on public.shifts for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned shifts"
on public.shifts for select
to authenticated
using (
  public.is_support_worker()
  and lower(support_worker_email) = public.current_app_email()
);

create policy "Admins can manage progress notes"
on public.progress_notes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read own progress notes"
on public.progress_notes for select
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can create own assigned progress notes"
on public.progress_notes for insert
to authenticated
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can update own progress notes"
on public.progress_notes for update
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins can manage incident reports"
on public.incident_reports for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read own incident reports"
on public.incident_reports for select
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can create own assigned incident reports"
on public.incident_reports for insert
to authenticated
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can update own incident reports"
on public.incident_reports for update
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins can manage module records"
on public.module_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage care documents"
on public.care_documents for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read assigned care documents"
on public.care_documents for select
to authenticated
using (
  public.is_support_worker()
  and participant_name is not null
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "No public storage access to care documents"
on storage.objects for select
to authenticated
using (bucket_id = 'care-documents' and false);

create policy "No public storage access to incident attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'incident-attachments' and false);

create policy "No public storage access to database backups"
on storage.objects for select
to authenticated
using (bucket_id = 'database-backups' and false);

create policy "Admins can read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create policy "Users can create own audit logs"
on public.audit_logs for insert
to authenticated
with check (
  public.current_user_is_active()
  and user_id = auth.uid()
  and lower(coalesce(user_email, '')) = public.current_app_email()
);

create policy "Admins can read backup logs"
on public.backup_logs for select
to authenticated
using (public.is_admin());

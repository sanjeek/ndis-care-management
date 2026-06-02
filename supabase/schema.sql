create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ndis_number text not null,
  plan_type text not null,
  emergency_contact text not null,
  support_needs text not null,
  date_of_birth date,
  emergency_contacts text,
  support_plans text,
  goals text,
  risk_information text,
  medical_notes text,
  allergies text,
  communication_preferences text,
  created_at timestamptz not null default now()
);

alter table public.participants
add column if not exists date_of_birth date;

alter table public.participants
add column if not exists emergency_contacts text;

alter table public.participants
add column if not exists support_plans text;

alter table public.participants
add column if not exists goals text;

alter table public.participants
add column if not exists risk_information text;

alter table public.participants
add column if not exists medical_notes text;

alter table public.participants
add column if not exists allergies text;

alter table public.participants
add column if not exists communication_preferences text;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organisation text,
  role text not null default 'support_worker' check (role in ('admin', 'support_worker', 'team_leader', 'family')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists active boolean not null default true;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('admin', 'support_worker', 'team_leader', 'family'));

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_user_id uuid references auth.users(id) on delete set null,
  family_name text not null,
  family_email text not null,
  participant_name text not null,
  relationship text not null,
  status text not null default 'approved' check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists family_members_email_participant_idx
on public.family_members (lower(family_email), participant_name);

create unique index if not exists family_members_email_participant_raw_idx
on public.family_members (family_email, participant_name);

create table if not exists public.support_workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null,
  availability text not null,
  qualifications text not null,
  compliance_status text not null,
  police_check_expiry date,
  ndis_worker_screening_expiry date,
  first_aid_expiry date,
  cpr_expiry date,
  drivers_licence_expiry date,
  training_certificates text,
  created_at timestamptz not null default now()
);

alter table public.support_workers
add column if not exists email text;

alter table public.support_workers
add column if not exists police_check_expiry date;

alter table public.support_workers
add column if not exists ndis_worker_screening_expiry date;

alter table public.support_workers
add column if not exists first_aid_expiry date;

alter table public.support_workers
add column if not exists cpr_expiry date;

alter table public.support_workers
add column if not exists drivers_licence_expiry date;

alter table public.support_workers
add column if not exists training_certificates text;

create table if not exists public.worker_invitations (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  worker_email text not null,
  invite_token text not null unique,
  portal_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.worker_availability (
  id uuid primary key default gen_random_uuid(),
  worker_user_id uuid references auth.users(id) on delete set null,
  worker_name text not null,
  worker_email text not null,
  available_date date not null,
  start_time time not null,
  end_time time not null,
  availability_status text not null default 'available' check (availability_status in ('available', 'preferred', 'unavailable')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_leave_requests (
  id uuid primary key default gen_random_uuid(),
  worker_user_id uuid references auth.users(id) on delete set null,
  worker_name text not null,
  worker_email text not null,
  leave_type text not null check (leave_type in ('annual_leave', 'sick_leave', 'unavailable')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_by_email text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  allowed_latitude numeric,
  allowed_longitude numeric,
  allowed_radius_m integer not null default 250,
  recurrence_series_id uuid,
  recurrence_type text not null default 'single',
  recurrence_interval_days integer,
  recurrence_count integer not null default 1,
  recurrence_position integer not null default 1,
  clock_in_latitude numeric,
  clock_in_longitude numeric,
  clock_in_accuracy_m numeric,
  clock_in_distance_m numeric,
  clock_out_latitude numeric,
  clock_out_longitude numeric,
  clock_out_accuracy_m numeric,
  clock_out_distance_m numeric,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_by_email text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_email text,
  rejection_reason text,
  payroll_ready_at timestamptz,
  worker_signature text,
  worker_signed_at timestamptz,
  participant_signature text,
  participant_signed_at timestamptz,
  signature_captured_by uuid references auth.users(id) on delete set null,
  signature_captured_by_email text,
  signed_record jsonb not null default '{}'::jsonb,
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
add column if not exists allowed_latitude numeric;

alter table public.shifts
add column if not exists allowed_longitude numeric;

alter table public.shifts
add column if not exists allowed_radius_m integer not null default 250;

alter table public.shifts
add column if not exists recurrence_series_id uuid;

alter table public.shifts
add column if not exists recurrence_type text not null default 'single';

alter table public.shifts
add column if not exists recurrence_interval_days integer;

alter table public.shifts
add column if not exists recurrence_count integer not null default 1;

alter table public.shifts
add column if not exists recurrence_position integer not null default 1;

alter table public.shifts
add column if not exists clock_in_latitude numeric;

alter table public.shifts
add column if not exists clock_in_longitude numeric;

alter table public.shifts
add column if not exists clock_in_accuracy_m numeric;

alter table public.shifts
add column if not exists clock_in_distance_m numeric;

alter table public.shifts
add column if not exists clock_out_latitude numeric;

alter table public.shifts
add column if not exists clock_out_longitude numeric;

alter table public.shifts
add column if not exists clock_out_accuracy_m numeric;

alter table public.shifts
add column if not exists clock_out_distance_m numeric;

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

alter table public.shifts
add column if not exists worker_signature text;

alter table public.shifts
add column if not exists worker_signed_at timestamptz;

alter table public.shifts
add column if not exists participant_signature text;

alter table public.shifts
add column if not exists participant_signed_at timestamptz;

alter table public.shifts
add column if not exists signature_captured_by uuid references auth.users(id) on delete set null;

alter table public.shifts
add column if not exists signature_captured_by_email text;

alter table public.shifts
add column if not exists signed_record jsonb not null default '{}'::jsonb;

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

alter table public.progress_notes
add column if not exists template_id uuid;

alter table public.progress_notes
add column if not exists template_name text;

alter table public.progress_notes
add column if not exists template_values jsonb not null default '{}'::jsonb;

alter table public.progress_notes
add column if not exists outcome_tracking jsonb not null default '{}'::jsonb;

create table if not exists public.progress_note_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'General',
  field_schema jsonb not null default '[]'::jsonb,
  outcome_schema jsonb not null default '[]'::jsonb,
  requires_signature boolean not null default true,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  reportable_to_commission boolean not null default false,
  reportable_incident_type text,
  notification_due_at timestamptz,
  ndis_notified_at timestamptz,
  immediate_actions text,
  impacted_person_supported text,
  participant_informed text,
  guardian_notified text,
  corrective_actions text,
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
add column if not exists reportable_to_commission boolean not null default false;

alter table public.incident_reports
add column if not exists reportable_incident_type text;

alter table public.incident_reports
add column if not exists notification_due_at timestamptz;

alter table public.incident_reports
add column if not exists ndis_notified_at timestamptz;

alter table public.incident_reports
add column if not exists immediate_actions text;

alter table public.incident_reports
add column if not exists impacted_person_supported text;

alter table public.incident_reports
add column if not exists participant_informed text;

alter table public.incident_reports
add column if not exists guardian_notified text;

alter table public.incident_reports
add column if not exists corrective_actions text;

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

create table if not exists public.care_plans (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  title text not null,
  goals text not null,
  support_instructions text not null,
  medication_information text,
  mobility_requirements text,
  participant_preferences text,
  review_date date,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_records (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  medication_name text not null,
  dosage text not null,
  route text,
  frequency text not null,
  administration_time text,
  administration_instructions text not null,
  prescribing_doctor text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'ceased')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_events (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references public.medication_records(id) on delete set null,
  participant_name text not null,
  medication_name text not null,
  event_type text not null check (event_type in ('administered', 'missed', 'incident')),
  event_date date not null,
  event_time time not null,
  dosage_given text,
  reason text,
  actions_taken text,
  severity text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_by_email text,
  recorded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  notification_type text not null,
  recipient_email text,
  subject text not null,
  status text not null default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  notification_type text not null,
  title text not null,
  body text not null,
  link_url text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.participants enable row level security;
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.support_workers enable row level security;
alter table public.worker_invitations enable row level security;
alter table public.worker_availability enable row level security;
alter table public.worker_leave_requests enable row level security;
alter table public.shifts enable row level security;
alter table public.progress_notes enable row level security;
alter table public.progress_note_templates enable row level security;
alter table public.incident_reports enable row level security;
alter table public.module_records enable row level security;
alter table public.care_plans enable row level security;
alter table public.medication_records enable row level security;
alter table public.medication_events enable row level security;
alter table public.care_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backup_logs enable row level security;
alter table public.email_notifications enable row level security;
alter table public.app_notifications enable row level security;

alter table public.participants force row level security;
alter table public.profiles force row level security;
alter table public.family_members force row level security;
alter table public.support_workers force row level security;
alter table public.worker_invitations force row level security;
alter table public.worker_availability force row level security;
alter table public.worker_leave_requests force row level security;
alter table public.shifts force row level security;
alter table public.progress_notes force row level security;
alter table public.progress_note_templates force row level security;
alter table public.incident_reports force row level security;
alter table public.module_records force row level security;
alter table public.care_plans force row level security;
alter table public.medication_records force row level security;
alter table public.medication_events force row level security;
alter table public.care_documents force row level security;
alter table public.audit_logs force row level security;
alter table public.backup_logs force row level security;
alter table public.email_notifications force row level security;
alter table public.app_notifications force row level security;

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
drop policy if exists "Admins can manage family members" on public.family_members;
drop policy if exists "Family can read own approved participant links" on public.family_members;
drop policy if exists "Admins can manage participants" on public.participants;
drop policy if exists "Team leaders can read participants" on public.participants;
drop policy if exists "Workers can read assigned participants" on public.participants;
drop policy if exists "Admins can manage support workers" on public.support_workers;
drop policy if exists "Workers can read own support worker record" on public.support_workers;
drop policy if exists "Admins can manage worker invitations" on public.worker_invitations;
drop policy if exists "Admins can manage worker availability" on public.worker_availability;
drop policy if exists "Team leaders can read worker availability" on public.worker_availability;
drop policy if exists "Workers can manage own availability" on public.worker_availability;
drop policy if exists "Admins can manage worker leave" on public.worker_leave_requests;
drop policy if exists "Team leaders can manage worker leave" on public.worker_leave_requests;
drop policy if exists "Workers can manage own leave" on public.worker_leave_requests;
drop policy if exists "Admins can manage shifts" on public.shifts;
drop policy if exists "Workers can read assigned shifts" on public.shifts;
drop policy if exists "Role based progress notes" on public.progress_notes;
drop policy if exists "Admins can manage progress notes" on public.progress_notes;
drop policy if exists "Workers can read own progress notes" on public.progress_notes;
drop policy if exists "Workers can create own assigned progress notes" on public.progress_notes;
drop policy if exists "Workers can update own progress notes" on public.progress_notes;
drop policy if exists "Admins can manage progress note templates" on public.progress_note_templates;
drop policy if exists "Staff can read active progress note templates" on public.progress_note_templates;
drop policy if exists "Role based incident reports" on public.incident_reports;
drop policy if exists "Admins can manage incident reports" on public.incident_reports;
drop policy if exists "Workers can read own incident reports" on public.incident_reports;
drop policy if exists "Workers can create own assigned incident reports" on public.incident_reports;
drop policy if exists "Workers can update own incident reports" on public.incident_reports;
drop policy if exists "Role based module records" on public.module_records;
drop policy if exists "Admins can manage module records" on public.module_records;
drop policy if exists "Admins can manage care plans" on public.care_plans;
drop policy if exists "Workers can read assigned care plans" on public.care_plans;
drop policy if exists "Admins can manage medication records" on public.medication_records;
drop policy if exists "Team leaders can manage medication records" on public.medication_records;
drop policy if exists "Workers can read assigned medication records" on public.medication_records;
drop policy if exists "Admins can manage medication events" on public.medication_events;
drop policy if exists "Team leaders can manage medication events" on public.medication_events;
drop policy if exists "Workers can read assigned medication events" on public.medication_events;
drop policy if exists "Workers can create assigned medication events" on public.medication_events;
drop policy if exists "Admins can manage care documents" on public.care_documents;
drop policy if exists "Workers can read assigned care documents" on public.care_documents;
drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Users can create own audit logs" on public.audit_logs;
drop policy if exists "Admins can read backup logs" on public.backup_logs;
drop policy if exists "Admins can manage backup logs" on public.backup_logs;
drop policy if exists "Admins can read email notifications" on public.email_notifications;
drop policy if exists "Users can read own app notifications" on public.app_notifications;
drop policy if exists "Users can update own app notifications" on public.app_notifications;
drop policy if exists "Admins can read app notifications" on public.app_notifications;
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

create or replace function public.is_family()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_active() and public.current_app_role() = 'family';
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

create policy "Admins can manage family members"
on public.family_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Family can read own approved participant links"
on public.family_members for select
to authenticated
using (
  public.is_family()
  and status = 'approved'
  and lower(family_email) = public.current_app_email()
);

create policy "Admins can manage participants"
on public.participants for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read participants"
on public.participants for select
to authenticated
using (public.is_team_leader());

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

create policy "Admins can manage worker availability"
on public.worker_availability for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read worker availability"
on public.worker_availability for select
to authenticated
using (public.is_team_leader());

create policy "Workers can manage own availability"
on public.worker_availability for all
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
);

create policy "Admins can manage worker leave"
on public.worker_leave_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can manage worker leave"
on public.worker_leave_requests for all
to authenticated
using (public.is_team_leader())
with check (public.is_team_leader());

create policy "Workers can manage own leave"
on public.worker_leave_requests for all
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
);

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

create policy "Admins can manage progress note templates"
on public.progress_note_templates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Staff can read active progress note templates"
on public.progress_note_templates for select
to authenticated
using (
  public.current_user_is_active()
  and public.current_app_role() in ('admin', 'team_leader', 'support_worker')
  and status = 'active'
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

create policy "Admins can manage care plans"
on public.care_plans for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Workers can read assigned care plans"
on public.care_plans for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins can manage medication records"
on public.medication_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can manage medication records"
on public.medication_records for all
to authenticated
using (public.is_team_leader())
with check (public.is_team_leader());

create policy "Workers can read assigned medication records"
on public.medication_records for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins can manage medication events"
on public.medication_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can manage medication events"
on public.medication_events for all
to authenticated
using (public.is_team_leader())
with check (public.is_team_leader());

create policy "Workers can read assigned medication events"
on public.medication_events for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can create assigned medication events"
on public.medication_events for insert
to authenticated
with check (
  public.is_support_worker()
  and lower(recorded_by_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

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

create policy "Admins can read email notifications"
on public.email_notifications for select
to authenticated
using (public.is_admin());

create policy "Users can read own app notifications"
on public.app_notifications for select
to authenticated
using (
  lower(recipient_email) = public.current_app_email()
  or user_id = auth.uid()
);

create policy "Users can update own app notifications"
on public.app_notifications for update
to authenticated
using (
  lower(recipient_email) = public.current_app_email()
  or user_id = auth.uid()
)
with check (
  lower(recipient_email) = public.current_app_email()
  or user_id = auth.uid()
);

create policy "Admins can read app notifications"
on public.app_notifications for select
to authenticated
using (public.is_admin());

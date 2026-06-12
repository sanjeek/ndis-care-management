create table if not exists public.organisation_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  phone text,
  manager_name text,
  manager_email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.organisation_branches(id) on delete set null,
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
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

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

alter table public.participants
add column if not exists medicare_number text;

alter table public.participants
add column if not exists display_name text;

alter table public.participants
add column if not exists preferred_name text;

alter table public.participants
add column if not exists person_alias text;

alter table public.participants
add column if not exists other_identifier text;

alter table public.participants
add column if not exists gender text;

alter table public.participants
add column if not exists sex text;

alter table public.participants
add column if not exists primary_address text;

alter table public.participants
add column if not exists postal_address text;

alter table public.participants
add column if not exists mobile_number text;

alter table public.participants
add column if not exists phone_number text;

alter table public.participants
add column if not exists email text;

alter table public.participants
add column if not exists secondary_email text;

alter table public.participants
add column if not exists preferred_contact_method text;

alter table public.participants
add column if not exists languages text;

alter table public.participants
add column if not exists cultural_identity text;

alter table public.participants
add column if not exists religion text;

alter table public.participants
add column if not exists marital_status text;

alter table public.participants
add column if not exists nationality text;

alter table public.participants
add column if not exists ethnicity text;

alter table public.participants
add column if not exists aboriginal_torres_strait_islander text;

alter table public.participants
add column if not exists place_of_birth text;

alter table public.participants
add column if not exists joined_date date;

alter table public.participants
add column if not exists next_review_date date;

alter table public.participants
add column if not exists client_status text not null default 'active';

alter table public.participants
add column if not exists requirements text;

alter table public.participants
add column if not exists preferences text;

alter table public.participants
add column if not exists need_to_know_information text;

alter table public.participants
add column if not exists useful_information text;

alter table public.participants
add column if not exists environmental_details text;

alter table public.participants
add column if not exists psychological_details text;

alter table public.participants
add column if not exists sensory_details text;

alter table public.participants
add column if not exists bmi text;

alter table public.participants
add column if not exists client_type text;

alter table public.participants
add column if not exists share_progress_notes boolean not null default false;

alter table public.participants
add column if not exists enable_sms_reminders boolean not null default false;

alter table public.participants
add column if not exists invoice_travel boolean not null default false;

alter table public.participants
add column if not exists private_info text;

alter table public.participants
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organisation text,
  role text not null default 'support_worker' check (role in ('super_admin', 'admin', 'support_worker', 'team_leader', 'family')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists active boolean not null default true;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('super_admin', 'admin', 'support_worker', 'team_leader', 'family'));

create table if not exists public.organisation_settings (
  id uuid primary key default gen_random_uuid(),
  setting_category text not null,
  setting_key text not null,
  setting_value text,
  details text,
  status text not null default 'active' check (status in ('active', 'planned', 'coming_soon', 'disabled', 'archived')),
  is_sensitive boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (setting_category, setting_key)
);

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
  branch_id uuid references public.organisation_branches(id) on delete set null,
  name text not null,
  email text not null,
  abn text,
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
add column if not exists abn text;

alter table public.support_workers
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

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

create table if not exists public.worker_training_records (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  worker_email text not null,
  training_name text not null,
  provider text,
  completion_date date,
  expiry_date date,
  certificate_reference text,
  evidence_location text,
  mandatory boolean not null default true,
  status text not null default 'current' check (status in ('current', 'expiring', 'expired', 'planned')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  contact_name text not null,
  relationship text,
  phone text not null,
  email text,
  priority text not null default 'primary' check (priority in ('primary', 'secondary', 'other')),
  consent_to_contact boolean not null default true,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create table if not exists public.travel_logs (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid,
  participant_name text not null,
  worker_name text not null,
  worker_email text not null,
  travel_date date not null,
  start_location text,
  end_location text,
  kilometres numeric not null default 0 check (kilometres >= 0),
  travel_purpose text not null,
  vehicle_registration text,
  notes text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'approved', 'rejected', 'invoiced')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_matches (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  worker_name text not null,
  worker_email text not null,
  match_score numeric not null default 0 check (match_score >= 0 and match_score <= 100),
  matching_preferences text,
  support_need_alignment text,
  restrictions text,
  status text not null default 'recommended' check (status in ('recommended', 'review_required', 'restricted', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_logs (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  organisation text,
  participant_name text,
  visit_date date not null,
  sign_in_time time not null,
  sign_out_time time,
  purpose text not null,
  host_worker_name text,
  host_worker_email text,
  status text not null default 'signed_in' check (status in ('signed_in', 'signed_out', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,
  make_model text not null,
  owner text,
  odometer numeric not null default 0 check (odometer >= 0),
  insurance_expiry date,
  registration_expiry date,
  service_due_date date,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_checklists (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  checklist_title text not null,
  assigned_worker_name text not null,
  assigned_worker_email text not null,
  due_date date,
  checklist_category text not null default 'custom',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  recurrence_pattern text not null default 'once' check (recurrence_pattern in ('once', 'per_shift', 'daily', 'weekly', 'fortnightly', 'monthly')),
  shift_id uuid,
  service_context text,
  location_context text,
  checklist_items text not null,
  pre_shift_checks text,
  support_instructions text,
  risk_controls text,
  evidence_required text not null default 'progress_note',
  completion_status text not null default 'open' check (completion_status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_items text,
  completion_percentage numeric not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  completion_notes text,
  worker_signature_required boolean not null default false,
  participant_signature_required boolean not null default false,
  escalation_required boolean not null default false,
  notes text,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  completed_by_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.participant_checklists add column if not exists checklist_category text not null default 'custom';
alter table public.participant_checklists add column if not exists priority text not null default 'medium';
alter table public.participant_checklists add column if not exists recurrence_pattern text not null default 'once';
alter table public.participant_checklists add column if not exists shift_id uuid;
alter table public.participant_checklists add column if not exists service_context text;
alter table public.participant_checklists add column if not exists location_context text;
alter table public.participant_checklists add column if not exists pre_shift_checks text;
alter table public.participant_checklists add column if not exists support_instructions text;
alter table public.participant_checklists add column if not exists risk_controls text;
alter table public.participant_checklists add column if not exists evidence_required text not null default 'progress_note';
alter table public.participant_checklists add column if not exists completed_items text;
alter table public.participant_checklists add column if not exists completion_percentage numeric not null default 0;
alter table public.participant_checklists add column if not exists completion_notes text;
alter table public.participant_checklists add column if not exists worker_signature_required boolean not null default false;
alter table public.participant_checklists add column if not exists participant_signature_required boolean not null default false;
alter table public.participant_checklists add column if not exists escalation_required boolean not null default false;

alter table public.participant_checklists drop constraint if exists participant_checklists_priority_check;
alter table public.participant_checklists add constraint participant_checklists_priority_check check (priority in ('low', 'medium', 'high', 'critical'));
alter table public.participant_checklists drop constraint if exists participant_checklists_recurrence_pattern_check;
alter table public.participant_checklists add constraint participant_checklists_recurrence_pattern_check check (recurrence_pattern in ('once', 'per_shift', 'daily', 'weekly', 'fortnightly', 'monthly'));
alter table public.participant_checklists drop constraint if exists participant_checklists_completion_percentage_check;
alter table public.participant_checklists add constraint participant_checklists_completion_percentage_check check (completion_percentage >= 0 and completion_percentage <= 100);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.organisation_branches(id) on delete set null,
  participant_name text not null,
  support_worker_name text,
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
alter column support_worker_name drop not null;

create table if not exists public.shift_attachments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  participant_name text not null,
  support_worker_name text,
  support_worker_email text,
  title text not null,
  attachment_type text not null default 'general',
  storage_bucket text not null default 'shift-attachments',
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  created_at timestamptz not null default now()
);

alter table public.shifts
add column if not exists support_worker_email text;

alter table public.shifts
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

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

create table if not exists public.participant_goals (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  title text not null,
  description text,
  target_outcome text,
  support_strategy text,
  start_date date,
  target_date date,
  current_progress_percent numeric not null default 0 check (current_progress_percent >= 0 and current_progress_percent <= 100),
  status text not null default 'active' check (status in ('active', 'paused', 'achieved', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_goals_participant_idx
on public.participant_goals (participant_name, status, target_date);

alter table public.progress_notes
add column if not exists participant_goal_id uuid references public.participant_goals(id) on delete set null;

alter table public.progress_notes
add column if not exists completed_activity boolean not null default false;

alter table public.progress_notes
add column if not exists goal_progress_increment numeric not null default 0 check (goal_progress_increment >= 0 and goal_progress_increment <= 100);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.organisation_branches(id) on delete set null,
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
  escalation_status text not null default 'none' check (escalation_status in ('none', 'manager_notified', 'investigation_required', 'ready_to_close', 'closed')),
  manager_notified_at timestamptz,
  investigation_completed_at timestamptz,
  attachment_names text[] not null default '{}'::text[],
  attachment_paths text[] not null default '{}'::text[],
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incident_reports
add column if not exists worker_email text;

alter table public.incident_reports
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

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
add column if not exists escalation_status text not null default 'none';

alter table public.incident_reports
drop constraint if exists incident_reports_escalation_status_check;

alter table public.incident_reports
add constraint incident_reports_escalation_status_check check (escalation_status in ('none', 'manager_notified', 'investigation_required', 'ready_to_close', 'closed'));

alter table public.incident_reports
add column if not exists manager_notified_at timestamptz;

alter table public.incident_reports
add column if not exists investigation_completed_at timestamptz;

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

create table if not exists public.ndis_funding_records (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  ndis_number text,
  plan_type text,
  plan_start date,
  plan_end date,
  plan_total_budget numeric not null default 0 check (plan_total_budget >= 0),
  support_category text not null,
  service_booking_reference text,
  service_booking_amount numeric not null default 0 check (service_booking_amount >= 0),
  spent_amount numeric not null default 0 check (spent_amount >= 0),
  provider_reference text,
  notes text,
  status text not null default 'active' check (status in ('active', 'exhausted', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.organisation_branches(id) on delete set null,
  invoice_number text not null unique,
  participant_name text not null,
  ndis_number text,
  plan_type text,
  funding_category text,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void')),
  total_amount numeric not null default 0 check (total_amount >= 0),
  travel_amount numeric not null default 0 check (travel_amount >= 0),
  service_amount numeric not null default 0 check (service_amount >= 0),
  generated_from text not null default 'approved_shifts',
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  participant_name text not null,
  worker_name text,
  service_date date,
  description text not null,
  ndis_line_item text not null,
  funding_category text,
  quantity numeric not null default 0 check (quantity >= 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  amount numeric not null default 0 check (amount >= 0),
  item_type text not null default 'service' check (item_type in ('service', 'travel', 'adjustment')),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  export_number text not null unique,
  period_start date not null,
  period_end date not null,
  generated_by uuid references auth.users(id) on delete set null,
  generated_by_email text,
  generated_by_name text,
  status text not null default 'generated',
  shift_count integer not null default 0,
  worker_count integer not null default 0,
  total_hours numeric not null default 0,
  regular_hours numeric not null default 0,
  overtime_hours numeric not null default 0,
  travel_km numeric not null default 0,
  travel_amount numeric not null default 0,
  payroll_amount numeric not null default 0,
  exported_shift_ids uuid[] not null default '{}'::uuid[],
  csv_text text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  state text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  worker_name text not null,
  worker_email text not null,
  worker_abn text,
  period_start date not null,
  period_end date not null,
  issue_date date not null default current_date,
  due_date date,
  total_hours numeric not null default 0 check (total_hours >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  status text not null default 'generated' check (status in ('generated', 'email_pending', 'emailed', 'paid', 'void')),
  email_to text,
  emailed_at timestamptz,
  generated_by uuid references auth.users(id) on delete set null,
  generated_by_email text,
  generated_by_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_invoice_items (
  id uuid primary key default gen_random_uuid(),
  contractor_invoice_id uuid not null references public.contractor_invoices(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  participant_name text not null,
  shift_date date not null,
  start_time text not null,
  end_time text not null,
  location text,
  shift_status text,
  approval_status text,
  day_type text not null default 'weekday' check (day_type in ('weekday', 'saturday', 'sunday', 'public_holiday')),
  public_holiday_name text,
  hours numeric not null default 0 check (hours >= 0),
  rate numeric not null default 0 check (rate >= 0),
  amount numeric not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.invoices
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

create table if not exists public.service_agreements (
  id uuid primary key default gen_random_uuid(),
  agreement_group_id uuid not null default gen_random_uuid(),
  participant_name text not null,
  ndis_number text,
  title text not null,
  version_number integer not null default 1 check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'signed', 'expired', 'renewal_due', 'closed')),
  start_date date,
  end_date date,
  renewal_reminder_at date,
  support_categories text,
  funding_summary text,
  terms text not null,
  participant_signature text,
  participant_signed_at timestamptz,
  signed_by_name text,
  pdf_generated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_documents (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.organisation_branches(id) on delete set null,
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

alter table public.care_documents
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

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

create table if not exists public.internal_conversations (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  participant_emails text[] not null default '{}'::text[],
  participant_names text[] not null default '{}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.internal_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_email text not null,
  sender_name text,
  sender_role text,
  body text not null,
  read_by_emails text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.participant_tasks (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  assigned_worker_name text not null,
  assigned_worker_email text not null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  completed_by_email text,
  status_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_tasks_worker_idx
on public.participant_tasks (lower(assigned_worker_email), status, due_date);

create index if not exists participant_tasks_participant_idx
on public.participant_tasks (participant_name, status, due_date);

create table if not exists public.support_coordination_provider_contacts (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  provider_name text not null,
  service_type text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_coordination_service_bookings (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  provider_contact_id uuid references public.support_coordination_provider_contacts(id) on delete set null,
  provider_name text not null,
  support_category text not null,
  line_item text,
  booking_reference text,
  start_date date,
  end_date date,
  budget_amount numeric not null default 0 check (budget_amount >= 0),
  used_amount numeric not null default 0 check (used_amount >= 0),
  status text not null default 'active' check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_coordination_case_meetings (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  meeting_date timestamptz not null,
  meeting_type text not null default 'review',
  attendees text,
  summary text,
  decisions text,
  next_steps text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_coordination_actions (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  goal_id uuid references public.participant_goals(id) on delete set null,
  case_meeting_id uuid references public.support_coordination_case_meetings(id) on delete set null,
  title text not null,
  description text,
  assigned_to_name text,
  assigned_to_email text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_coordination_contacts_participant_idx
on public.support_coordination_provider_contacts (participant_name, status);

create index if not exists support_coordination_bookings_participant_idx
on public.support_coordination_service_bookings (participant_name, status, end_date);

create index if not exists support_coordination_meetings_participant_idx
on public.support_coordination_case_meetings (participant_name, meeting_date);

create index if not exists support_coordination_actions_participant_idx
on public.support_coordination_actions (participant_name, status, due_date);

create index if not exists support_coordination_actions_assigned_idx
on public.support_coordination_actions (lower(assigned_to_email), status, due_date);

create table if not exists public.participant_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  assessor_name text not null,
  assessor_email text not null,
  assessment_date date not null default current_date,
  review_date date,
  overall_risk_level text not null default 'medium' check (overall_risk_level in ('low', 'medium', 'high', 'critical')),
  environmental_risks text not null,
  behavioural_risks text not null,
  medication_risks text not null,
  manual_handling_risks text not null,
  control_measures text not null,
  status text not null default 'draft' check (status in ('draft', 'review_required', 'approved', 'archived')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_email text,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_risk_assessments_participant_idx
on public.participant_risk_assessments (participant_name, overall_risk_level, review_date);

create index if not exists participant_risk_assessments_assessor_idx
on public.participant_risk_assessments (lower(assessor_email), status, review_date);

create index if not exists participants_branch_idx
on public.participants (branch_id);

create index if not exists support_workers_branch_idx
on public.support_workers (branch_id);

create index if not exists worker_training_records_worker_idx
on public.worker_training_records (lower(worker_email), status, expiry_date);

create index if not exists participant_emergency_contacts_participant_idx
on public.participant_emergency_contacts (participant_name, status, priority);

create index if not exists organisation_settings_category_idx
on public.organisation_settings (setting_category, setting_key, status);

create index if not exists shifts_branch_idx
on public.shifts (branch_id, starts_at);

create index if not exists travel_logs_worker_idx
on public.travel_logs (worker_email, travel_date);

create index if not exists participant_matches_participant_idx
on public.participant_matches (participant_name, worker_email);

create index if not exists visitor_logs_visit_date_idx
on public.visitor_logs (visit_date, status);

create index if not exists participant_checklists_worker_idx
on public.participant_checklists (assigned_worker_email, completion_status);

create index if not exists participant_checklists_due_idx
on public.participant_checklists (due_date, completion_status, priority);

create index if not exists participant_checklists_category_idx
on public.participant_checklists (checklist_category, recurrence_pattern);

create index if not exists shift_attachments_shift_idx
on public.shift_attachments (shift_id, support_worker_email);

create index if not exists incident_reports_branch_idx
on public.incident_reports (branch_id, status);

create index if not exists invoices_branch_idx
on public.invoices (branch_id, status);

create unique index if not exists public_holidays_date_state_idx
on public.public_holidays (holiday_date, (coalesce(state, 'national')));

create index if not exists contractor_invoices_worker_period_idx
on public.contractor_invoices (lower(worker_email), period_start, period_end);

create index if not exists contractor_invoices_status_idx
on public.contractor_invoices (status, created_at);

create index if not exists contractor_invoice_items_invoice_idx
on public.contractor_invoice_items (contractor_invoice_id, shift_date);

create index if not exists contractor_invoice_items_shift_idx
on public.contractor_invoice_items (shift_id);

create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.participants enable row level security;
alter table public.organisation_branches enable row level security;
alter table public.profiles enable row level security;
alter table public.organisation_settings enable row level security;
alter table public.family_members enable row level security;
alter table public.support_workers enable row level security;
alter table public.worker_training_records enable row level security;
alter table public.participant_emergency_contacts enable row level security;
alter table public.worker_invitations enable row level security;
alter table public.worker_availability enable row level security;
alter table public.worker_leave_requests enable row level security;
alter table public.travel_logs enable row level security;
alter table public.participant_matches enable row level security;
alter table public.visitor_logs enable row level security;
alter table public.vehicles enable row level security;
alter table public.participant_checklists enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_attachments enable row level security;
alter table public.progress_notes enable row level security;
alter table public.progress_note_templates enable row level security;
alter table public.participant_goals enable row level security;
alter table public.incident_reports enable row level security;
alter table public.module_records enable row level security;
alter table public.care_plans enable row level security;
alter table public.medication_records enable row level security;
alter table public.medication_events enable row level security;
alter table public.ndis_funding_records enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payroll_exports enable row level security;
alter table public.public_holidays enable row level security;
alter table public.contractor_invoices enable row level security;
alter table public.contractor_invoice_items enable row level security;
alter table public.service_agreements enable row level security;
alter table public.care_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backup_logs enable row level security;
alter table public.email_notifications enable row level security;
alter table public.app_notifications enable row level security;
alter table public.internal_conversations enable row level security;
alter table public.internal_messages enable row level security;
alter table public.participant_tasks enable row level security;
alter table public.support_coordination_provider_contacts enable row level security;
alter table public.support_coordination_service_bookings enable row level security;
alter table public.support_coordination_case_meetings enable row level security;
alter table public.support_coordination_actions enable row level security;
alter table public.participant_risk_assessments enable row level security;

alter table public.rate_limit_counters enable row level security;
alter table public.rate_limit_counters force row level security;

alter table public.participants force row level security;
alter table public.organisation_branches force row level security;
alter table public.profiles force row level security;
alter table public.organisation_settings force row level security;
alter table public.family_members force row level security;
alter table public.support_workers force row level security;
alter table public.worker_training_records force row level security;
alter table public.participant_emergency_contacts force row level security;
alter table public.worker_invitations force row level security;
alter table public.worker_availability force row level security;
alter table public.worker_leave_requests force row level security;
alter table public.travel_logs force row level security;
alter table public.participant_matches force row level security;
alter table public.visitor_logs force row level security;
alter table public.vehicles force row level security;
alter table public.participant_checklists force row level security;
alter table public.shifts force row level security;
alter table public.shift_attachments force row level security;
alter table public.progress_notes force row level security;
alter table public.progress_note_templates force row level security;
alter table public.participant_goals force row level security;
alter table public.incident_reports force row level security;
alter table public.module_records force row level security;
alter table public.care_plans force row level security;
alter table public.medication_records force row level security;
alter table public.medication_events force row level security;
alter table public.ndis_funding_records force row level security;
alter table public.invoices force row level security;
alter table public.invoice_items force row level security;
alter table public.payroll_exports force row level security;
alter table public.public_holidays force row level security;
alter table public.contractor_invoices force row level security;
alter table public.contractor_invoice_items force row level security;
alter table public.service_agreements force row level security;
alter table public.care_documents force row level security;
alter table public.audit_logs force row level security;
alter table public.backup_logs force row level security;
alter table public.email_notifications force row level security;
alter table public.app_notifications force row level security;
alter table public.internal_conversations force row level security;
alter table public.internal_messages force row level security;
alter table public.participant_tasks force row level security;
alter table public.support_coordination_provider_contacts force row level security;
alter table public.support_coordination_service_bookings force row level security;
alter table public.support_coordination_case_meetings force row level security;
alter table public.support_coordination_actions force row level security;
alter table public.participant_risk_assessments force row level security;

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
  'shift-attachments',
  'shift-attachments',
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
drop policy if exists "Admins can manage organisation branches" on public.organisation_branches;
drop policy if exists "Team leaders can read organisation branches" on public.organisation_branches;
drop policy if exists "Authenticated users can manage support workers" on public.support_workers;
drop policy if exists "Authenticated users can manage worker invitations" on public.worker_invitations;
drop policy if exists "Authenticated users can manage shifts" on public.shifts;
drop policy if exists "Authenticated users can manage progress notes" on public.progress_notes;
drop policy if exists "Authenticated users can manage incident reports" on public.incident_reports;
drop policy if exists "Authenticated users can manage module records" on public.module_records;
drop policy if exists "Users can read their profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins can manage organisation settings" on public.organisation_settings;
drop policy if exists "Team leaders can read organisation settings" on public.organisation_settings;
drop policy if exists "Admins can manage family members" on public.family_members;
drop policy if exists "Family can read own approved participant links" on public.family_members;
drop policy if exists "Admins can manage participants" on public.participants;
drop policy if exists "Team leaders can read participants" on public.participants;
drop policy if exists "Workers can read assigned participants" on public.participants;
drop policy if exists "Admins can manage support workers" on public.support_workers;
drop policy if exists "Workers can read own support worker record" on public.support_workers;
drop policy if exists "Admins and team leaders can manage worker training records" on public.worker_training_records;
drop policy if exists "Workers can manage own training records" on public.worker_training_records;
drop policy if exists "Admins and team leaders can manage participant emergency contacts" on public.participant_emergency_contacts;
drop policy if exists "Workers can read assigned participant emergency contacts" on public.participant_emergency_contacts;
drop policy if exists "Admins can manage worker invitations" on public.worker_invitations;
drop policy if exists "Admins can manage worker availability" on public.worker_availability;
drop policy if exists "Team leaders can read worker availability" on public.worker_availability;
drop policy if exists "Workers can manage own availability" on public.worker_availability;
drop policy if exists "Admins can manage worker leave" on public.worker_leave_requests;
drop policy if exists "Team leaders can manage worker leave" on public.worker_leave_requests;
drop policy if exists "Workers can manage own leave" on public.worker_leave_requests;
drop policy if exists "Admins and team leaders can manage travel logs" on public.travel_logs;
drop policy if exists "Workers can manage own travel logs" on public.travel_logs;
drop policy if exists "Admins and team leaders can manage participant matches" on public.participant_matches;
drop policy if exists "Admins and team leaders can manage visitor logs" on public.visitor_logs;
drop policy if exists "Admins and team leaders can manage vehicles" on public.vehicles;
drop policy if exists "Admins and team leaders can manage participant checklists" on public.participant_checklists;
drop policy if exists "Workers can manage assigned participant checklists" on public.participant_checklists;
drop policy if exists "Admins and team leaders can manage shift attachments" on public.shift_attachments;
drop policy if exists "Workers can manage assigned shift attachments" on public.shift_attachments;
drop policy if exists "Admins can manage shifts" on public.shifts;
drop policy if exists "Workers can read assigned shifts" on public.shifts;
drop policy if exists "Workers can read open shifts" on public.shifts;
drop policy if exists "Role based progress notes" on public.progress_notes;
drop policy if exists "Admins can manage progress notes" on public.progress_notes;
drop policy if exists "Workers can read own progress notes" on public.progress_notes;
drop policy if exists "Workers can create own assigned progress notes" on public.progress_notes;
drop policy if exists "Workers can update own progress notes" on public.progress_notes;
drop policy if exists "Admins can manage progress note templates" on public.progress_note_templates;
drop policy if exists "Staff can read active progress note templates" on public.progress_note_templates;
drop policy if exists "Admins and team leaders can manage participant goals" on public.participant_goals;
drop policy if exists "Workers can read assigned participant goals" on public.participant_goals;
drop policy if exists "Family can read approved participant goals" on public.participant_goals;
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
drop policy if exists "Admins can manage NDIS funding records" on public.ndis_funding_records;
drop policy if exists "Team leaders can read NDIS funding records" on public.ndis_funding_records;
drop policy if exists "Admins can manage invoices" on public.invoices;
drop policy if exists "Team leaders can read invoices" on public.invoices;
drop policy if exists "Admins can manage invoice items" on public.invoice_items;
drop policy if exists "Team leaders can read invoice items" on public.invoice_items;
drop policy if exists "Admins can manage payroll exports" on public.payroll_exports;
drop policy if exists "Team leaders can read payroll exports" on public.payroll_exports;
drop policy if exists "Authenticated users can read public holidays" on public.public_holidays;
drop policy if exists "Admins can manage public holidays" on public.public_holidays;
drop policy if exists "Admins can manage contractor invoices" on public.contractor_invoices;
drop policy if exists "Team leaders can read contractor invoices" on public.contractor_invoices;
drop policy if exists "Workers can read own contractor invoices" on public.contractor_invoices;
drop policy if exists "Admins can manage contractor invoice items" on public.contractor_invoice_items;
drop policy if exists "Team leaders can read contractor invoice items" on public.contractor_invoice_items;
drop policy if exists "Workers can read own contractor invoice items" on public.contractor_invoice_items;
drop policy if exists "Admins can manage service agreements" on public.service_agreements;
drop policy if exists "Team leaders can read service agreements" on public.service_agreements;
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
drop policy if exists "Users can read own internal conversations" on public.internal_conversations;
drop policy if exists "Users can create own internal conversations" on public.internal_conversations;
drop policy if exists "Users can update own internal conversations" on public.internal_conversations;
drop policy if exists "Users can read own internal messages" on public.internal_messages;
drop policy if exists "Users can create own internal messages" on public.internal_messages;
drop policy if exists "Admins and team leaders can manage participant tasks" on public.participant_tasks;
drop policy if exists "Workers can read assigned participant tasks" on public.participant_tasks;
drop policy if exists "Workers can update assigned participant tasks" on public.participant_tasks;
drop policy if exists "Admins and team leaders can manage support coordination contacts" on public.support_coordination_provider_contacts;
drop policy if exists "Workers can read assigned support coordination contacts" on public.support_coordination_provider_contacts;
drop policy if exists "Admins and team leaders can manage support coordination bookings" on public.support_coordination_service_bookings;
drop policy if exists "Workers can read assigned support coordination bookings" on public.support_coordination_service_bookings;
drop policy if exists "Admins and team leaders can manage support coordination meetings" on public.support_coordination_case_meetings;
drop policy if exists "Workers can read assigned support coordination meetings" on public.support_coordination_case_meetings;
drop policy if exists "Admins and team leaders can manage support coordination actions" on public.support_coordination_actions;
drop policy if exists "Workers can read assigned support coordination actions" on public.support_coordination_actions;
drop policy if exists "Workers can update assigned support coordination actions" on public.support_coordination_actions;
drop policy if exists "Admins and team leaders can manage participant risk assessments" on public.participant_risk_assessments;
drop policy if exists "Workers can read assigned participant risk assessments" on public.participant_risk_assessments;
drop policy if exists "Workers can create assigned participant risk assessments" on public.participant_risk_assessments;
drop policy if exists "Workers can update assigned participant risk assessments" on public.participant_risk_assessments;
drop policy if exists "No public storage access to care documents" on storage.objects;
drop policy if exists "No public storage access to incident attachments" on storage.objects;
drop policy if exists "No public storage access to shift attachments" on storage.objects;
drop policy if exists "No public storage access to database backups" on storage.objects;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case when lower(coalesce(auth.jwt() ->> 'email', '')) = 'sanjee@live.com' then 'super_admin' end,
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
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb
where lower(email) = 'sanjee@live.com';

insert into public.profiles (id, email, full_name, organisation, role, active)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email), coalesce(raw_user_meta_data ->> 'organisation', ''), 'super_admin', true
from auth.users
where lower(email) = 'sanjee@live.com'
on conflict (id) do update
set role = 'super_admin',
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
  select public.current_user_is_active() and public.current_app_role() in ('super_admin', 'admin', 'provider_admin');
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

create or replace function public.apply_progress_note_goal_increment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.participant_goal_id is not null and new.completed_activity = true and coalesce(new.goal_progress_increment, 0) > 0 then
    update public.participant_goals
    set current_progress_percent = least(100, current_progress_percent + new.goal_progress_increment),
        status = case when least(100, current_progress_percent + new.goal_progress_increment) >= 100 then 'achieved' else status end,
        updated_at = now()
    where id = new.participant_goal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists progress_notes_goal_increment_trigger on public.progress_notes;

create trigger progress_notes_goal_increment_trigger
after insert on public.progress_notes
for each row
execute function public.apply_progress_note_goal_increment();

create policy "Admins can manage organisation branches"
on public.organisation_branches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read organisation branches"
on public.organisation_branches for select
to authenticated
using (public.is_team_leader());

create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage organisation settings"
on public.organisation_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read organisation settings"
on public.organisation_settings for select
to authenticated
using (public.is_team_leader());

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

create policy "Admins and team leaders can manage worker training records"
on public.worker_training_records for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can manage own training records"
on public.worker_training_records for all
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
);

create policy "Admins and team leaders can manage participant emergency contacts"
on public.participant_emergency_contacts for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned participant emergency contacts"
on public.participant_emergency_contacts for select
to authenticated
using (
  public.is_support_worker()
  and participant_name in (
    select participant_name from public.shifts
    where lower(support_worker_email) = public.current_app_email()
  )
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

create policy "Admins and team leaders can manage travel logs"
on public.travel_logs for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can manage own travel logs"
on public.travel_logs for all
to authenticated
using (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(worker_email) = public.current_app_email()
);

create policy "Admins and team leaders can manage participant matches"
on public.participant_matches for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Admins and team leaders can manage visitor logs"
on public.visitor_logs for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Admins and team leaders can manage vehicles"
on public.vehicles for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Admins and team leaders can manage participant checklists"
on public.participant_checklists for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can manage assigned participant checklists"
on public.participant_checklists for all
to authenticated
using (
  public.is_support_worker()
  and lower(assigned_worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(assigned_worker_email) = public.current_app_email()
);

create policy "Admins and team leaders can manage shift attachments"
on public.shift_attachments for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can manage assigned shift attachments"
on public.shift_attachments for all
to authenticated
using (
  public.is_support_worker()
  and lower(support_worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(support_worker_email) = public.current_app_email()
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

create policy "Workers can read open shifts"
on public.shifts for select
to authenticated
using (
  public.is_support_worker()
  and nullif(support_worker_email, '') is null
  and coalesce(status, '') not in ('Cancelled', 'Rejected')
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

create policy "Admins and team leaders can manage participant goals"
on public.participant_goals for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned participant goals"
on public.participant_goals for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Family can read approved participant goals"
on public.participant_goals for select
to authenticated
using (
  public.is_family()
  and status in ('active', 'achieved')
  and exists (
    select 1
    from public.family_members
    where family_members.participant_name = participant_goals.participant_name
      and lower(family_members.family_email) = public.current_app_email()
      and family_members.status = 'approved'
  )
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

create policy "Admins and team leaders can manage participant tasks"
on public.participant_tasks for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned participant tasks"
on public.participant_tasks for select
to authenticated
using (
  public.is_support_worker()
  and lower(assigned_worker_email) = public.current_app_email()
);

create policy "Workers can update assigned participant tasks"
on public.participant_tasks for update
to authenticated
using (
  public.is_support_worker()
  and lower(assigned_worker_email) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(assigned_worker_email) = public.current_app_email()
);

create policy "Admins and team leaders can manage support coordination contacts"
on public.support_coordination_provider_contacts for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination contacts"
on public.support_coordination_provider_contacts for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins and team leaders can manage support coordination bookings"
on public.support_coordination_service_bookings for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination bookings"
on public.support_coordination_service_bookings for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins and team leaders can manage support coordination meetings"
on public.support_coordination_case_meetings for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination meetings"
on public.support_coordination_case_meetings for select
to authenticated
using (
  public.is_support_worker()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Admins and team leaders can manage support coordination actions"
on public.support_coordination_actions for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination actions"
on public.support_coordination_actions for select
to authenticated
using (
  public.is_support_worker()
  and (
    lower(coalesce(assigned_to_email, '')) = public.current_app_email()
    or public.worker_is_assigned_to_participant(participant_name)
  )
);

create policy "Workers can update assigned support coordination actions"
on public.support_coordination_actions for update
to authenticated
using (
  public.is_support_worker()
  and lower(coalesce(assigned_to_email, '')) = public.current_app_email()
)
with check (
  public.is_support_worker()
  and lower(coalesce(assigned_to_email, '')) = public.current_app_email()
);

create policy "Admins and team leaders can manage participant risk assessments"
on public.participant_risk_assessments for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned participant risk assessments"
on public.participant_risk_assessments for select
to authenticated
using (
  public.is_support_worker()
  and (
    lower(assessor_email) = public.current_app_email()
    or public.worker_is_assigned_to_participant(participant_name)
  )
);

create policy "Workers can create assigned participant risk assessments"
on public.participant_risk_assessments for insert
to authenticated
with check (
  public.is_support_worker()
  and lower(assessor_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
);

create policy "Workers can update assigned participant risk assessments"
on public.participant_risk_assessments for update
to authenticated
using (
  public.is_support_worker()
  and lower(assessor_email) = public.current_app_email()
  and public.worker_is_assigned_to_participant(participant_name)
)
with check (
  public.is_support_worker()
  and lower(assessor_email) = public.current_app_email()
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

create policy "Admins can manage NDIS funding records"
on public.ndis_funding_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read NDIS funding records"
on public.ndis_funding_records for select
to authenticated
using (public.is_team_leader());

create policy "Admins can manage invoices"
on public.invoices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read invoices"
on public.invoices for select
to authenticated
using (public.is_team_leader());

create policy "Admins can manage invoice items"
on public.invoice_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read invoice items"
on public.invoice_items for select
to authenticated
using (public.is_team_leader());

create policy "Admins can manage payroll exports"
on public.payroll_exports for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read payroll exports"
on public.payroll_exports for select
to authenticated
using (public.is_team_leader());

create policy "Authenticated users can read public holidays"
on public.public_holidays for select
to authenticated
using (auth.role() = 'authenticated');

create policy "Admins can manage public holidays"
on public.public_holidays for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage contractor invoices"
on public.contractor_invoices for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read contractor invoices"
on public.contractor_invoices for select
to authenticated
using (public.is_team_leader());

create policy "Workers can read own contractor invoices"
on public.contractor_invoices for select
to authenticated
using (public.is_support_worker() and lower(worker_email) = public.current_app_email());

create policy "Admins can manage contractor invoice items"
on public.contractor_invoice_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read contractor invoice items"
on public.contractor_invoice_items for select
to authenticated
using (
  public.is_team_leader()
  and exists (
    select 1 from public.contractor_invoices
    where contractor_invoices.id = contractor_invoice_items.contractor_invoice_id
  )
);

create policy "Workers can read own contractor invoice items"
on public.contractor_invoice_items for select
to authenticated
using (
  public.is_support_worker()
  and exists (
    select 1 from public.contractor_invoices
    where contractor_invoices.id = contractor_invoice_items.contractor_invoice_id
      and lower(contractor_invoices.worker_email) = public.current_app_email()
  )
);

create policy "Admins can manage service agreements"
on public.service_agreements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read service agreements"
on public.service_agreements for select
to authenticated
using (public.is_team_leader());

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

create policy "No public storage access to shift attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'shift-attachments' and false);

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

create policy "Users can read own internal conversations"
on public.internal_conversations for select
to authenticated
using (public.current_app_email() = any(participant_emails));

create policy "Users can create own internal conversations"
on public.internal_conversations for insert
to authenticated
with check (
  public.current_user_is_active()
  and public.current_app_email() = any(participant_emails)
);

create policy "Users can update own internal conversations"
on public.internal_conversations for update
to authenticated
using (public.current_app_email() = any(participant_emails))
with check (public.current_app_email() = any(participant_emails));

create policy "Users can read own internal messages"
on public.internal_messages for select
to authenticated
using (
  exists (
    select 1
    from public.internal_conversations
    where internal_conversations.id = internal_messages.conversation_id
      and public.current_app_email() = any(internal_conversations.participant_emails)
  )
);

create policy "Users can create own internal messages"
on public.internal_messages for insert
to authenticated
with check (
  public.current_user_is_active()
  and lower(sender_email) = public.current_app_email()
  and exists (
    select 1
    from public.internal_conversations
    where internal_conversations.id = internal_messages.conversation_id
      and public.current_app_email() = any(internal_conversations.participant_emails)
  )
);

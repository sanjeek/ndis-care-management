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

alter table public.support_coordination_provider_contacts enable row level security;
alter table public.support_coordination_service_bookings enable row level security;
alter table public.support_coordination_case_meetings enable row level security;
alter table public.support_coordination_actions enable row level security;

alter table public.support_coordination_provider_contacts force row level security;
alter table public.support_coordination_service_bookings force row level security;
alter table public.support_coordination_case_meetings force row level security;
alter table public.support_coordination_actions force row level security;

drop policy if exists "Admins and team leaders can manage support coordination contacts" on public.support_coordination_provider_contacts;
drop policy if exists "Workers can read assigned support coordination contacts" on public.support_coordination_provider_contacts;
drop policy if exists "Admins and team leaders can manage support coordination bookings" on public.support_coordination_service_bookings;
drop policy if exists "Workers can read assigned support coordination bookings" on public.support_coordination_service_bookings;
drop policy if exists "Admins and team leaders can manage support coordination meetings" on public.support_coordination_case_meetings;
drop policy if exists "Workers can read assigned support coordination meetings" on public.support_coordination_case_meetings;
drop policy if exists "Admins and team leaders can manage support coordination actions" on public.support_coordination_actions;
drop policy if exists "Workers can read assigned support coordination actions" on public.support_coordination_actions;
drop policy if exists "Workers can update assigned support coordination actions" on public.support_coordination_actions;

create policy "Admins and team leaders can manage support coordination contacts"
on public.support_coordination_provider_contacts for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination contacts"
on public.support_coordination_provider_contacts for select
to authenticated
using (public.is_support_worker() and public.worker_is_assigned_to_participant(participant_name));

create policy "Admins and team leaders can manage support coordination bookings"
on public.support_coordination_service_bookings for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination bookings"
on public.support_coordination_service_bookings for select
to authenticated
using (public.is_support_worker() and public.worker_is_assigned_to_participant(participant_name));

create policy "Admins and team leaders can manage support coordination meetings"
on public.support_coordination_case_meetings for all
to authenticated
using (public.is_admin() or public.is_team_leader())
with check (public.is_admin() or public.is_team_leader());

create policy "Workers can read assigned support coordination meetings"
on public.support_coordination_case_meetings for select
to authenticated
using (public.is_support_worker() and public.worker_is_assigned_to_participant(participant_name));

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
using (public.is_support_worker() and lower(coalesce(assigned_to_email, '')) = public.current_app_email())
with check (public.is_support_worker() and lower(coalesce(assigned_to_email, '')) = public.current_app_email());

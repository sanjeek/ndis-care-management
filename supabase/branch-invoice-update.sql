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

alter table if exists public.participants
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

alter table if exists public.support_workers
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

alter table if exists public.shifts
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

alter table if exists public.incident_reports
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

alter table if exists public.invoices
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

alter table if exists public.care_documents
add column if not exists branch_id uuid references public.organisation_branches(id) on delete set null;

do $$
begin
  if to_regclass('public.participants') is not null then
    execute 'create index if not exists participants_branch_idx on public.participants (branch_id)';
  end if;

  if to_regclass('public.support_workers') is not null then
    execute 'create index if not exists support_workers_branch_idx on public.support_workers (branch_id)';
  end if;

  if to_regclass('public.shifts') is not null then
    execute 'create index if not exists shifts_branch_idx on public.shifts (branch_id, starts_at)';
  end if;

  if to_regclass('public.incident_reports') is not null then
    execute 'create index if not exists incident_reports_branch_idx on public.incident_reports (branch_id, status)';
  end if;

  if to_regclass('public.invoices') is not null then
    execute 'create index if not exists invoices_branch_idx on public.invoices (branch_id, status)';
  end if;
end $$;

alter table public.organisation_branches enable row level security;
alter table public.organisation_branches force row level security;

drop policy if exists "Admins can manage organisation branches" on public.organisation_branches;
drop policy if exists "Team leaders can read organisation branches" on public.organisation_branches;

create policy "Admins can manage organisation branches"
on public.organisation_branches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Team leaders can read organisation branches"
on public.organisation_branches for select
to authenticated
using (public.is_team_leader());

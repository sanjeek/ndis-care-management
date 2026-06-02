# Production Readiness Remediation Report

Reviewed: 2026-06-02

## Critical

- **Database schema must be applied after every release**
  - Risk: New pages and API routes depend on columns/tables such as `worker_availability`, `email_notifications`, and expanded `participants` profile fields. If `supabase/schema.sql` is not run in Supabase, live saves and reads can fail.
  - Remediation: Apply `supabase/schema.sql` in Supabase SQL Editor after deployment, then verify tables and RLS policies exist.

- **Route protection is client-side only**
  - Risk: `AppShell` redirects unauthenticated users in the browser, but static pages can still render shell HTML before client redirect. Database RLS protects data, but production should also block private routes at the edge/server layer.
  - Remediation: Add Next.js middleware using Supabase SSR session validation for `/dashboard`, `/participants`, `/participants/:id`, `/support-workers`, `/rostering`, `/timesheets`, `/progress-notes`, `/incident-reports`, `/documents`, `/admin/*`, `/profile`, and `/settings`.

- **Service role key must never be exposed**
  - Risk: Server routes require `SUPABASE_SERVICE_ROLE_KEY`. If accidentally prefixed with `NEXT_PUBLIC_` or pasted into client env, it can bypass RLS.
  - Remediation: Keep service role only in Vercel server environment variables. Rotate immediately if exposed.

## High

- **Participant records rely on participant name for related lookups**
  - Risk: Documents, shifts, notes, and incidents link to participants by name. A name change or duplicate name can show incorrect related records.
  - Remediation: Add `participant_id` foreign keys to shifts, progress notes, incident reports, and care documents. Keep participant name as display-only snapshot.

- **Form validation is basic**
  - Risk: Critical fields such as NDIS number, dates, shift times, incident severity, medical notes, and email addresses are mostly string-trimmed, not schema-validated.
  - Remediation: Add shared validation schemas for API routes. Validate date ranges, end-after-start, NDIS number format, email format, and required incident/reportable fields.

- **Worker-created quick incident form still uses direct client insert**
  - Risk: Worker portal quick incident form does not use the richer `/api/incidents` route with attachments, incident number generation, and notification logic.
  - Remediation: Replace worker quick incident persistence with the secure incident API route.

- **Email notifications depend on optional provider configuration**
  - Risk: Notifications are logged as skipped if `RESEND_API_KEY` and `EMAIL_FROM` are missing.
  - Remediation: Configure production email provider variables and add an admin email notification log page.

## Medium

- **No edit workflow for participant profile yet**
  - Risk: Admin can create rich participant profiles, but updates require future edit support.
  - Remediation: Add `PATCH /api/participants/:id` with audit logging and participant-update notifications.

- **Document access is signed-link based**
  - Risk: Signed URLs are short-lived and permission checked, but any recipient can use the URL until expiry.
  - Remediation: Keep expiry short, record all downloads, and consider streaming documents through the API instead of returning signed URLs.

- **Operational tables lack updated timestamps and indexes**
  - Risk: Filtering by worker email, participant, created date, status, and approval state can slow down as data grows.
  - Remediation: Add indexes for `support_worker_email`, `worker_email`, `participant_name`, `status`, `created_at`, and add `updated_at` triggers.

- **Automated backups are export-only**
  - Risk: Restore process is a guided plan, not a one-click restore. This is safer, but recovery time can be slower.
  - Remediation: Document restore runbook and test restoration in a staging Supabase project monthly.

## Low

- **Legacy prototype component remains**
  - Risk: `components/care-app.tsx` appears unused and contains older demo-style patterns.
  - Remediation: Remove after confirming no route imports it.

- **Some empty-state and notice text is still generic**
  - Risk: Users may not know whether empty pages mean no data, no permission, or missing schema.
  - Remediation: Improve empty states with role-aware messages and setup checks.

- **Performance can be improved with server-side data loading**
  - Risk: Large client bundle and client-side Supabase reads may be slower on mobile.
  - Remediation: Move larger modules to server/API-backed paginated lists, especially participants, shifts, documents, incidents, and audit logs.

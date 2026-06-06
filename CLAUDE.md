# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js, port 3000)
npm run build    # Production build
npm run lint     # ESLint (next lint)
```

There are no automated tests in this project.

## Environment

Copy `.env.local.example` to `.env.local` and fill in the Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # used by server-side API routes only
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

The app degrades gracefully when Supabase is not configured — `lib/supabase.ts` exports `isSupabaseConfigured` and `supabase` (which may be `null`). UI components check this before calling the client.

## Architecture

**Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth)

### Pages and routing

All authenticated pages live under `app/`. Each route is a thin `page.tsx` that renders a single component imported from `components/`. The real page logic is always in `components/`.

The product is called **CareOS** — an NDIS (National Disability Insurance Scheme) provider management platform with role-based access for five user types.

### Auth and roles

`lib/auth.ts` is the single source of truth for roles and route permissions.

- Roles: `super_admin` | `admin` | `team_leader` | `support_worker` | `family`
- `canAccessRoute(role, pathname)` — called in both middleware and the client `AppShell`
- `visibleNavForRole(role, items)` — filters nav items to only what that role can see
- Hard-coded `superAdminEmails` list in `lib/auth.ts` grants `super_admin` regardless of the stored role

**Middleware** (`middleware.ts`) — edge function that validates the `careos-access-token` cookie on every private route before the page renders. It calls the Supabase REST API directly (no SDK) to stay within the edge runtime.

**Client guard** (`components/app-shell.tsx`) — the `AppShell` component re-checks the session via `supabase.auth.getSession()` on mount and enforces the same `canAccessRoute` check client-side. It also handles 30-minute inactivity logout with a 5-minute warning dialog.

### AppShell

Every authenticated page is wrapped in `AppShell` (from `components/app-shell.tsx`). It provides:
- Collapsible grouped sidebar nav (nav groups defined at the bottom of `app-shell.tsx`)
- Global search via `/api/search`
- Bell notification panel (polls `app_notifications` table every 60 s)
- PDF export — clicking "PDF" builds a multi-page PDF entirely in the browser from visible DOM text (no external library, raw PDF spec written in `buildCareOsReportPdf`). Any page that wants PDF export wraps its content in an element with `data-careos-export`.
- Date picker (Australia/Sydney timezone)
- Inactivity session expiry

### API routes

All API routes live under `app/api/`. Every route follows the same auth pattern:

```ts
const auth = await requireApiUser(request);  // from lib/api-auth.ts
if ("response" in auth) return auth.response; // returns 401/403 automatically
if (!requireRole(auth.user, ["admin"])) return NextResponse.json({ message: "..." }, { status: 403 });
```

`requireApiUser` uses the `SUPABASE_SERVICE_ROLE_KEY` (via `serviceClient()` in `lib/server-audit.ts`) to read the `profiles` table, so API routes always run with the service role client, not the user's anon client.

### Audit logging

Two entry points:
- `lib/audit.ts` — client-side, calls `POST /api/audit` with the user's Bearer token
- `lib/server-audit.ts` — server-side, writes directly to the `audit_logs` table via the service client

Both record `action`, `table_name`, `record_id`, `record_label`, and a `metadata` JSON object.

### Database schema

`supabase/schema.sql` contains the full schema. Run it against your Supabase project to create all tables. There are two patch files (`branch-invoice-update.sql`, `support-coordination-update.sql`) that add columns to existing tables — run these after the main schema if you need those features.

### Design system

Custom Tailwind colors defined in `tailwind.config.ts`:
- `ink` (#172033) — primary text
- `gumleaf` (#4b5fe8) — primary brand/interactive (indigo-blue)
- `coral` (#d65452) — error/danger
- `banksia` (#b7791f) — amber/warning
- `harbour` (#0e8fb4) — info/teal

### Session cookies

Three cookies are set on login and cleared on logout:
- `careos-access-token` — Supabase JWT, read by middleware
- `careos-session` / `careos-role` — server-synced via `lib/session-sync.ts`
- `careos-client-session` / `careos-client-role` — set client-side in `AppShell` for inactivity tracking

### Notable lib files

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Client-side Supabase client (may be null) |
| `lib/auth.ts` | Role definitions, route access, nav filtering |
| `lib/api-auth.ts` | `requireApiUser` / `requireRole` for API routes |
| `lib/server-audit.ts` | Service-role client + `recordServerAudit` |
| `lib/audit.ts` | Client-side audit helper |
| `lib/data.ts` | Static seed data + `navItems` definition |
| `lib/email-notifications.ts` | `sendCareNotification` + admin recipient helpers |
| `lib/session-sync.ts` | `syncServerSession` / `clearServerSession` cookie sync |
| `lib/contractor-invoices.ts` | Weekly contractor invoice generation logic |

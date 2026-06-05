import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser, requireRole } from "@/lib/api-auth";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ query, results: [] });
  }

  const term = `%${escapeLike(query)}%`;
  const role = auth.user.role;
  const email = auth.user.email.toLowerCase();
  const isAdmin = requireRole(auth.user, ["admin"]);
  const isManager = requireRole(auth.user, ["admin", "team_leader"]);
  const assignedParticipants = role === "support_worker" ? await loadAssignedParticipants(auth.client, email) : [];
  const familyParticipants = role === "family" ? await loadFamilyParticipants(auth.client, email) : [];
  const results: SearchResult[] = [];

  if (isAdmin || role === "support_worker" || role === "family") {
    let participants = auth.client
      .from("participants")
      .select("id, name, ndis_number, plan_type")
      .or(`name.ilike.${term},ndis_number.ilike.${term},plan_type.ilike.${term}`)
      .limit(8);
    if (role === "support_worker") participants = participants.in("name", assignedParticipants.length ? assignedParticipants : ["__none__"]);
    if (role === "family") participants = participants.in("name", familyParticipants.length ? familyParticipants : ["__none__"]);
    const { data } = await participants;
    results.push(...(data ?? []).map((row) => ({
      id: `participant-${row.id}`,
      type: "Participant",
      title: String(row.name ?? ""),
      subtitle: [row.ndis_number, row.plan_type].filter(Boolean).join(" | ") || "Participant profile",
      href: isAdmin ? `/participants/${row.id}` : "/participants"
    })));
  }

  if (isAdmin) {
    const { data } = await auth.client
      .from("support_workers")
      .select("id, name, email, role")
      .or(`name.ilike.${term},email.ilike.${term},role.ilike.${term},qualifications.ilike.${term}`)
      .limit(8);
    results.push(...(data ?? []).map((row) => ({
      id: `worker-${row.id}`,
      type: "Support worker",
      title: String(row.name ?? row.email ?? ""),
      subtitle: [row.email, row.role].filter(Boolean).join(" | ") || "Support worker",
      href: "/support-workers"
    })));
  }

  if (isAdmin || role === "support_worker") {
    let training = auth.client
      .from("worker_training_records")
      .select("id, worker_name, worker_email, training_name, provider, status, expiry_date")
      .or(`worker_name.ilike.${term},worker_email.ilike.${term},training_name.ilike.${term},provider.ilike.${term},status.ilike.${term}`)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .limit(8);
    if (role === "support_worker") training = training.eq("worker_email", email);
    const { data } = await training;
    results.push(...(data ?? []).map((row) => ({
      id: `training-${row.id}`,
      type: "Training",
      title: String(row.training_name ?? "Training record"),
      subtitle: [row.worker_name, row.status, row.expiry_date].filter(Boolean).join(" | "),
      href: "/training-records"
    })));
  }

  if (isManager || role === "support_worker") {
    let contacts = auth.client
      .from("participant_emergency_contacts")
      .select("id, participant_name, contact_name, relationship, phone, status")
      .or(`participant_name.ilike.${term},contact_name.ilike.${term},relationship.ilike.${term},phone.ilike.${term},status.ilike.${term}`)
      .order("participant_name", { ascending: true })
      .limit(8);
    if (role === "support_worker") contacts = contacts.in("participant_name", assignedParticipants.length ? assignedParticipants : ["__none__"]);
    const { data } = await contacts;
    results.push(...(data ?? []).map((row) => ({
      id: `emergency-contact-${row.id}`,
      type: "Emergency contact",
      title: String(row.contact_name ?? "Emergency contact"),
      subtitle: [row.participant_name, row.relationship, row.phone].filter(Boolean).join(" | "),
      href: "/participants"
    })));
  }

  if (isManager || role === "support_worker" || role === "family") {
    let shifts = auth.client
      .from("shifts")
      .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, status")
      .or(`participant_name.ilike.${term},support_worker_name.ilike.${term},location.ilike.${term},status.ilike.${term}`)
      .order("starts_at", { ascending: false })
      .limit(10);
    if (role === "support_worker") shifts = shifts.eq("support_worker_email", email);
    if (role === "family") shifts = shifts.in("participant_name", familyParticipants.length ? familyParticipants : ["__none__"]);
    const { data } = await shifts;
    results.push(...(data ?? []).map((row) => ({
      id: `shift-${row.id}`,
      type: "Shift",
      title: `${row.participant_name} shift`,
      subtitle: [row.support_worker_name, dateTime(row.starts_at), row.status].filter(Boolean).join(" | "),
      href: role === "support_worker" ? "/my-shifts" : role === "family" ? "/family-portal" : "/rostering"
    })));
  }

  if (isManager || role === "support_worker" || role === "family") {
    let notes = auth.client
      .from("progress_notes")
      .select("id, participant_name, worker_name, worker_email, service_date, category, note, outcomes")
      .or(`participant_name.ilike.${term},worker_name.ilike.${term},category.ilike.${term},note.ilike.${term},outcomes.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (role === "support_worker") notes = notes.eq("worker_email", email);
    if (role === "family") notes = notes.in("participant_name", familyParticipants.length ? familyParticipants : ["__none__"]);
    const { data } = await notes;
    results.push(...(data ?? []).map((row) => ({
      id: `note-${row.id}`,
      type: "Progress note",
      title: `${row.participant_name} - ${row.category || "Progress note"}`,
      subtitle: [row.worker_name, row.service_date, snippet(row.note || row.outcomes)].filter(Boolean).join(" | "),
      href: role === "family" ? "/family-portal" : "/progress-notes"
    })));
  }

  if (isManager || role === "support_worker") {
    let incidents = auth.client
      .from("incident_reports")
      .select("id, incident_number, participant_name, worker_name, worker_email, severity, status, summary")
      .or(`incident_number.ilike.${term},participant_name.ilike.${term},worker_name.ilike.${term},severity.ilike.${term},status.ilike.${term},summary.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(10);
    if (role === "support_worker") incidents = incidents.eq("worker_email", email);
    const { data } = await incidents;
    results.push(...(data ?? []).map((row) => ({
      id: `incident-${row.id}`,
      type: "Incident",
      title: String(row.incident_number || `${row.participant_name} incident`),
      subtitle: [row.participant_name, row.severity, row.status, snippet(row.summary)].filter(Boolean).join(" | "),
      href: "/incident-reports"
    })));
  }

  if (isManager) {
    const { data } = await auth.client
      .from("invoices")
      .select("id, invoice_number, participant_name, status, total_amount")
      .or(`invoice_number.ilike.${term},participant_name.ilike.${term},status.ilike.${term},funding_category.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(8);
    results.push(...(data ?? []).map((row) => ({
      id: `invoice-${row.id}`,
      type: "Invoice",
      title: String(row.invoice_number ?? "Invoice"),
      subtitle: [row.participant_name, row.status, currency(row.total_amount)].filter(Boolean).join(" | "),
      href: "/invoices"
    })));

    const { data: contractorInvoices } = await auth.client
      .from("contractor_invoices")
      .select("id, invoice_number, worker_name, worker_email, worker_abn, status, total_amount")
      .or(`invoice_number.ilike.${term},worker_name.ilike.${term},worker_email.ilike.${term},worker_abn.ilike.${term},status.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(8);
    results.push(...(contractorInvoices ?? []).map((row) => ({
      id: `contractor-invoice-${row.id}`,
      type: "Contractor invoice",
      title: String(row.invoice_number ?? "Contractor invoice"),
      subtitle: [row.worker_name, row.worker_email, row.status, currency(row.total_amount)].filter(Boolean).join(" | "),
      href: "/contractor-invoices"
    })));
  }

  if (isAdmin) {
    const { data } = await auth.client
      .from("care_documents")
      .select("id, title, participant_name, file_name, content_type")
      .or(`title.ilike.${term},participant_name.ilike.${term},file_name.ilike.${term},content_type.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(8);
    results.push(...(data ?? []).map((row) => ({
      id: `document-${row.id}`,
      type: "Document",
      title: String(row.title ?? row.file_name ?? "Document"),
      subtitle: [row.participant_name, row.file_name].filter(Boolean).join(" | ") || "Secure document",
      href: "/documents"
    })));
  }

  return NextResponse.json({ query, results: results.slice(0, 40) });
}

async function loadAssignedParticipants(client: SupabaseClient, email: string) {
  const { data } = await client.from("shifts").select("participant_name").eq("support_worker_email", email);
  return Array.from(new Set((data ?? []).map((row: { participant_name?: string }) => String(row.participant_name ?? "")).filter(Boolean)));
}

async function loadFamilyParticipants(client: SupabaseClient, email: string) {
  const { data } = await client.from("family_members").select("participant_name").eq("family_email", email).eq("status", "approved");
  return Array.from(new Set((data ?? []).map((row: { participant_name?: string }) => String(row.participant_name ?? "")).filter(Boolean)));
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function snippet(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function dateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function currency(value: unknown) {
  const amount = Number(value ?? 0);
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

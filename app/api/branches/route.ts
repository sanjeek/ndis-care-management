import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin and team leader users can view branches." }, { status: 403 });
  }

  const [branches, participants, workers, shifts, incidents, invoices] = await Promise.all([
    auth.client.from("organisation_branches").select("*").order("name", { ascending: true }),
    auth.client.from("participants").select("id, name, branch_id").order("name", { ascending: true }),
    auth.client.from("support_workers").select("id, name, email, branch_id").order("name", { ascending: true }),
    auth.client.from("shifts").select("id, branch_id, status, starts_at, ends_at, approval_status, clock_out_at"),
    auth.client.from("incident_reports").select("id, branch_id, status"),
    auth.client.from("invoices").select("id, branch_id, status, total_amount")
  ]);
  for (const result of [branches, participants, workers, shifts, incidents, invoices]) {
    if (result.error) return NextResponse.json({ message: result.error.message }, { status: 400 });
  }

  return NextResponse.json({
    canManage: auth.user.role === "admin",
    branches: branches.data ?? [],
    participants: participants.data ?? [],
    workers: workers.data ?? [],
    reports: (branches.data ?? []).map((branch) => branchReport(branch, participants.data ?? [], workers.data ?? [], shifts.data ?? [], incidents.data ?? [], invoices.data ?? []))
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can manage branches." }, { status: 403 });
  }

  const body = await request.json();
  const action = text(body.action || "save");
  if (action === "assign") return assignBranch(auth, body);

  const id = text(body.id);
  const payload = {
    name: text(body.name),
    address: text(body.address),
    phone: text(body.phone),
    manager_name: text(body.manager_name),
    manager_email: text(body.manager_email),
    status: text(body.status) === "inactive" ? "inactive" : "active",
    updated_at: new Date().toISOString()
  };
  if (!payload.name) return NextResponse.json({ message: "Branch name is required." }, { status: 400 });

  const query = id
    ? auth.client.from("organisation_branches").update(payload).eq("id", id).select("id").single()
    : auth.client.from("organisation_branches").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: id ? "branch_update" : "branch_create",
    tableName: "organisation_branches",
    recordId: data.id,
    recordLabel: payload.name,
    metadata: { status: payload.status }
  });

  return NextResponse.json({ message: id ? "Branch updated." : "Branch created.", id: data.id });
}

async function assignBranch(auth: Exclude<Awaited<ReturnType<typeof requireApiUser>>, { response: NextResponse }>, body: Record<string, unknown>) {
  const branchId = text(body.branch_id) || null;
  const targetType = text(body.target_type);
  const targetId = text(body.target_id);
  if (!targetId || !["participant", "worker"].includes(targetType)) {
    return NextResponse.json({ message: "Select a participant or worker to assign." }, { status: 400 });
  }
  const table = targetType === "participant" ? "participants" : "support_workers";
  const { error } = await auth.client.from(table).update({ branch_id: branchId }).eq("id", targetId);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "branch_assignment",
    tableName: table,
    recordId: targetId,
    metadata: { branchId, targetType }
  });
  return NextResponse.json({ message: "Branch assignment updated." });
}

function branchReport(branch: Record<string, unknown>, participants: Record<string, unknown>[], workers: Record<string, unknown>[], shifts: Record<string, unknown>[], incidents: Record<string, unknown>[], invoices: Record<string, unknown>[]) {
  const id = String(branch.id ?? "");
  const branchShifts = shifts.filter((row) => String(row.branch_id ?? "") === id);
  const completed = branchShifts.filter((row) => {
    const status = String(row.status ?? "").toLowerCase();
    const approval = String(row.approval_status ?? "").toLowerCase();
    return Boolean(row.clock_out_at) || status === "completed" || approval === "approved";
  });
  return {
    branchId: id,
    participantCount: participants.filter((row) => String(row.branch_id ?? "") === id).length,
    workerCount: workers.filter((row) => String(row.branch_id ?? "") === id).length,
    serviceHours: Math.round(completed.reduce((sum, row) => sum + shiftHours(String(row.starts_at ?? ""), String(row.ends_at ?? "")), 0) * 10) / 10,
    openIncidents: incidents.filter((row) => String(row.branch_id ?? "") === id && !["closed", "resolved", "completed"].includes(String(row.status ?? "").toLowerCase())).length,
    outstandingInvoices: invoices.filter((row) => String(row.branch_id ?? "") === id && !["paid", "closed", "void"].includes(String(row.status ?? "").toLowerCase())).length,
    invoiceTotal: invoices.filter((row) => String(row.branch_id ?? "") === id).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
  };
}

function shiftHours(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return (end.getTime() - start.getTime()) / 3600000;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

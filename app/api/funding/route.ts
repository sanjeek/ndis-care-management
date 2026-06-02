import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can manage NDIS funding records." }, { status: 403 });
  }

  const body = await request.json();
  const participantName = String(body.participant_name ?? "").trim();
  const supportCategory = String(body.support_category ?? "").trim();
  const planTotalBudget = money(body.plan_total_budget);
  const serviceBookingAmount = money(body.service_booking_amount);
  const spentAmount = money(body.spent_amount);

  if (!participantName || !supportCategory) {
    return NextResponse.json({ message: "Participant and support category are required." }, { status: 400 });
  }
  if (planTotalBudget <= 0) {
    return NextResponse.json({ message: "Plan total budget must be greater than zero." }, { status: 400 });
  }
  if (spentAmount > serviceBookingAmount && serviceBookingAmount > 0) {
    return NextResponse.json({ message: "Spent amount cannot be greater than the service booking amount." }, { status: 400 });
  }

  const payload = {
    participant_name: participantName,
    ndis_number: String(body.ndis_number ?? "").trim(),
    plan_type: String(body.plan_type ?? "").trim(),
    plan_start: nullableDate(body.plan_start),
    plan_end: nullableDate(body.plan_end),
    plan_total_budget: planTotalBudget,
    support_category: supportCategory,
    service_booking_reference: String(body.service_booking_reference ?? "").trim(),
    service_booking_amount: serviceBookingAmount,
    spent_amount: spentAmount,
    provider_reference: String(body.provider_reference ?? "").trim(),
    notes: String(body.notes ?? "").trim(),
    status: normaliseStatus(body.status),
    created_by: auth.user.id,
    created_by_email: auth.user.email
  };

  const { data: record, error } = await auth.client.from("ndis_funding_records").insert(payload).select("id").single();
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "funding_record_create",
    tableName: "ndis_funding_records",
    recordId: record.id,
    recordLabel: `${participantName} ${supportCategory}`,
    metadata: {
      participantName,
      supportCategory,
      planTotalBudget,
      serviceBookingAmount,
      spentAmount,
      status: payload.status
    }
  });

  return NextResponse.json({ message: "NDIS funding record saved.", id: record.id });
}

function money(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nullableDate(value: unknown) {
  const date = String(value ?? "").trim();
  return date || null;
}

function normaliseStatus(value: unknown) {
  const status = String(value ?? "active").trim().toLowerCase();
  return ["active", "exhausted", "closed"].includes(status) ? status : "active";
}

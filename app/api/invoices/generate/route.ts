import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type ShiftRow = {
  id: string;
  participant_name: string;
  support_worker_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  approval_status: string | null;
};

type ParticipantRow = {
  name: string;
  ndis_number: string | null;
  plan_type: string | null;
};

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can generate invoices." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const ndisLineItem = text(body.ndis_line_item) || "01_011_0107_1_1";
  const fundingCategory = text(body.funding_category) || "Core - Assistance with Daily Life";
  const hourlyRate = money(body.hourly_rate);
  const travelKm = money(body.travel_km);
  const travelRate = money(body.travel_rate);
  const dueDays = Math.max(0, Math.round(money(body.due_days) || 14));
  const issueDate = text(body.issue_date) || new Date().toISOString().slice(0, 10);
  const dueDate = addDays(issueDate, dueDays);

  if (hourlyRate <= 0) {
    return NextResponse.json({ message: "Hourly rate must be greater than zero." }, { status: 400 });
  }

  const [{ data: shifts, error: shiftError }, { data: existingItems, error: existingError }, { data: participants }] = await Promise.all([
    auth.client
      .from("shifts")
      .select("id, participant_name, support_worker_name, starts_at, ends_at, approval_status")
      .eq("approval_status", "approved")
      .order("starts_at", { ascending: true }),
    auth.client.from("invoice_items").select("shift_id").not("shift_id", "is", null),
    auth.client.from("participants").select("name, ndis_number, plan_type")
  ]);

  if (shiftError) return NextResponse.json({ message: shiftError.message }, { status: 400 });
  if (existingError) return NextResponse.json({ message: existingError.message }, { status: 400 });

  const invoicedShiftIds = new Set((existingItems ?? []).map((item) => String(item.shift_id)));
  const uninvoiced = ((shifts ?? []) as ShiftRow[]).filter((shift) => shift.id && !invoicedShiftIds.has(shift.id));
  if (!uninvoiced.length) {
    return NextResponse.json({ message: "No approved uninvoiced shifts found." }, { status: 400 });
  }

  const participantMap = new Map((participants ?? []).map((participant) => [String(participant.name), participant as ParticipantRow]));
  const grouped = groupByParticipant(uninvoiced);
  const createdInvoiceIds: string[] = [];
  let createdItemCount = 0;

  for (const [participantName, rows] of grouped.entries()) {
    const participant = participantMap.get(participantName);
    const serviceItems = rows.map((shift) => {
      const hours = shiftHours(shift);
      const amount = roundMoney(hours * hourlyRate);
      return {
        shift_id: shift.id,
        participant_name: participantName,
        worker_name: shift.support_worker_name ?? "",
        service_date: dateOnly(shift.starts_at),
        description: `${participantName} support shift ${timeRange(shift)}`,
        ndis_line_item: ndisLineItem,
        funding_category: fundingCategory,
        quantity: hours,
        unit_price: hourlyRate,
        amount,
        item_type: "service"
      };
    });
    const travelItems = travelKm > 0 && travelRate > 0
      ? rows.map((shift) => ({
          shift_id: shift.id,
          participant_name: participantName,
          worker_name: shift.support_worker_name ?? "",
          service_date: dateOnly(shift.starts_at),
          description: `${participantName} provider travel ${timeRange(shift)}`,
          ndis_line_item: `${ndisLineItem}-TRAVEL`,
          funding_category: fundingCategory,
          quantity: travelKm,
          unit_price: travelRate,
          amount: roundMoney(travelKm * travelRate),
          item_type: "travel"
        }))
      : [];
    const items = [...serviceItems, ...travelItems];
    const serviceAmount = roundMoney(serviceItems.reduce((sum, item) => sum + item.amount, 0));
    const travelAmount = roundMoney(travelItems.reduce((sum, item) => sum + item.amount, 0));
    const totalAmount = roundMoney(serviceAmount + travelAmount);

    const { data: invoice, error: invoiceError } = await auth.client
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber(participantName),
        participant_name: participantName,
        ndis_number: participant?.ndis_number ?? "",
        plan_type: participant?.plan_type ?? "",
        funding_category: fundingCategory,
        issue_date: issueDate,
        due_date: dueDate,
        status: "issued",
        total_amount: totalAmount,
        travel_amount: travelAmount,
        service_amount: serviceAmount,
        generated_from: "approved_shifts",
        created_by: auth.user.id,
        created_by_email: auth.user.email
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError) return NextResponse.json({ message: invoiceError.message }, { status: 400 });

    const invoiceItems = items.map((item) => ({ ...item, invoice_id: invoice.id }));
    const { error: itemsError } = await auth.client.from("invoice_items").insert(invoiceItems);
    if (itemsError) return NextResponse.json({ message: itemsError.message }, { status: 400 });

    createdInvoiceIds.push(invoice.id);
    createdItemCount += invoiceItems.length;
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "invoice_generate",
    tableName: "invoices",
    recordLabel: `${createdInvoiceIds.length} invoices generated`,
    metadata: { invoiceCount: createdInvoiceIds.length, itemCount: createdItemCount, fundingCategory, ndisLineItem, hourlyRate, travelKm, travelRate }
  });

  return NextResponse.json({ message: `${createdInvoiceIds.length} invoices generated from approved shifts.`, invoiceCount: createdInvoiceIds.length, itemCount: createdItemCount });
}

function groupByParticipant(shifts: ShiftRow[]) {
  return shifts.reduce<Map<string, ShiftRow[]>>((map, shift) => {
    const key = shift.participant_name || "Unknown participant";
    map.set(key, [...(map.get(key) ?? []), shift]);
    return map;
  }, new Map());
}

function shiftHours(shift: ShiftRow) {
  const start = shift.starts_at ? new Date(shift.starts_at) : null;
  const end = shift.ends_at ? new Date(shift.ends_at) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, roundMoney((end.getTime() - start.getTime()) / 3600000));
}

function money(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function dateOnly(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function timeRange(shift: ShiftRow) {
  return `${timeOnly(shift.starts_at)}-${timeOnly(shift.ends_at)}`;
}

function timeOnly(value: string | null) {
  return value ? value.slice(11, 16) : "time not recorded";
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function invoiceNumber(participantName: string) {
  const prefix = participantName.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6) || "NDIS";
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

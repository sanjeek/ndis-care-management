import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { notifyCareEvent } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

type ShiftRow = {
  id: string;
  participant_name: string | null;
  support_worker_name: string | null;
  support_worker_email: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  approval_status: string | null;
  payroll_ready_at: string | null;
};

type PayrollLine = {
  shiftId: string;
  workerName: string;
  workerEmail: string;
  participantName: string;
  serviceDate: string;
  start: string;
  end: string;
  location: string;
  hours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  travelKm: number;
  travelAmount: number;
  totalAmount: number;
};

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can generate payroll exports." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const periodStart = text(body.period_start);
  const periodEnd = text(body.period_end);
  const hourlyRate = positiveNumber(body.hourly_rate, 0);
  const overtimeRate = positiveNumber(body.overtime_rate, hourlyRate * 1.5);
  const overtimeAfterHours = positiveNumber(body.overtime_after_hours, 38);
  const travelKmPerShift = positiveNumber(body.travel_km_per_shift, 0);
  const travelRate = positiveNumber(body.travel_rate, 1);

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ message: "Payroll period start and end dates are required." }, { status: 400 });
  }

  const startDate = new Date(`${periodStart}T00:00:00`);
  const endDate = new Date(`${periodEnd}T23:59:59`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ message: "Payroll period dates are invalid." }, { status: 400 });
  }

  const { data: shifts, error } = await auth.client
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, clock_in_at, clock_out_at, approval_status, payroll_ready_at")
    .eq("approval_status", "approved")
    .gte("starts_at", startDate.toISOString())
    .lte("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const approvedShifts = (shifts ?? []).filter((shift) => Boolean(shift.payroll_ready_at)) as ShiftRow[];
  if (!approvedShifts.length) {
    return NextResponse.json({ message: "No approved payroll-ready shifts found for this period." }, { status: 400 });
  }

  const lines = buildPayrollLines(approvedShifts, {
    hourlyRate,
    overtimeRate,
    overtimeAfterHours,
    travelKmPerShift,
    travelRate
  });
  const totals = lines.reduce(
    (sum, line) => ({
      hours: sum.hours + line.hours,
      regularHours: sum.regularHours + line.regularHours,
      overtimeHours: sum.overtimeHours + line.overtimeHours,
      travelKm: sum.travelKm + line.travelKm,
      travelAmount: sum.travelAmount + line.travelAmount,
      payrollAmount: sum.payrollAmount + line.totalAmount
    }),
    { hours: 0, regularHours: 0, overtimeHours: 0, travelKm: 0, travelAmount: 0, payrollAmount: 0 }
  );
  const workerCount = new Set(lines.map((line) => line.workerEmail || line.workerName)).size;
  const exportNumber = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const csv = payrollCsv(lines);

  const { data: saved, error: saveError } = await auth.client
    .from("payroll_exports")
    .insert({
      export_number: exportNumber,
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: auth.user.id,
      generated_by_email: auth.user.email,
      generated_by_name: auth.user.name,
      shift_count: lines.length,
      worker_count: workerCount,
      total_hours: round2(totals.hours),
      regular_hours: round2(totals.regularHours),
      overtime_hours: round2(totals.overtimeHours),
      travel_km: round2(totals.travelKm),
      travel_amount: round2(totals.travelAmount),
      payroll_amount: round2(totals.payrollAmount),
      exported_shift_ids: lines.map((line) => line.shiftId),
      csv_text: csv,
      metadata: { hourlyRate, overtimeRate, overtimeAfterHours, travelKmPerShift, travelRate }
    })
    .select("id")
    .single();

  if (saveError) return NextResponse.json({ message: saveError.message }, { status: 400 });

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "payroll_export",
    tableName: "payroll_exports",
    recordId: saved.id,
    recordLabel: exportNumber,
    metadata: { periodStart, periodEnd, shiftCount: lines.length, workerCount, totals }
  });

  const recipients = await getAdminNotificationRecipients(auth.client, { fallback: [auth.user.email] });
  await notifyCareEvent(auth.client, {
    type: "payroll_export",
    to: recipients,
    title: "Payroll export generated",
    body: `${exportNumber} includes ${lines.length} approved shifts for ${workerCount} workers.`,
    linkUrl: "/payroll",
    subject: `Payroll export generated: ${exportNumber}`,
    text: [
      `Payroll export: ${exportNumber}`,
      `Period: ${periodStart} to ${periodEnd}`,
      `Approved shifts: ${lines.length}`,
      `Workers: ${workerCount}`,
      `Total hours: ${round2(totals.hours)}`,
      `Payroll amount: ${currency(totals.payrollAmount)}`,
      `Open payroll: ${appUrl("/payroll")}`
    ].join("\n"),
    metadata: { exportId: saved.id, exportNumber, periodStart, periodEnd, shiftCount: lines.length, workerCount },
    email: false
  });

  return NextResponse.json({
    message: `${exportNumber} generated from ${lines.length} approved shifts.`,
    exportNumber,
    csv,
    totals: {
      shiftCount: lines.length,
      workerCount,
      totalHours: round2(totals.hours),
      regularHours: round2(totals.regularHours),
      overtimeHours: round2(totals.overtimeHours),
      travelKm: round2(totals.travelKm),
      travelAmount: round2(totals.travelAmount),
      payrollAmount: round2(totals.payrollAmount)
    }
  });
}

function buildPayrollLines(shifts: ShiftRow[], rates: { hourlyRate: number; overtimeRate: number; overtimeAfterHours: number; travelKmPerShift: number; travelRate: number }) {
  const workerHours = new Map<string, number>();
  return shifts.map((shift) => {
    const start = new Date(shift.clock_in_at || shift.starts_at || "");
    const end = new Date(shift.clock_out_at || shift.ends_at || "");
    const hours = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start ? 0 : round2((end.getTime() - start.getTime()) / 3600000);
    const key = (shift.support_worker_email || shift.support_worker_name || "unknown").toLowerCase();
    const used = workerHours.get(key) ?? 0;
    const regularHours = Math.max(0, Math.min(hours, rates.overtimeAfterHours - used));
    const overtimeHours = Math.max(0, hours - regularHours);
    workerHours.set(key, used + hours);
    const travelAmount = round2(rates.travelKmPerShift * rates.travelRate);
    return {
      shiftId: shift.id,
      workerName: shift.support_worker_name || "Not recorded",
      workerEmail: shift.support_worker_email || "",
      participantName: shift.participant_name || "Not recorded",
      serviceDate: isoDate(shift.starts_at),
      start: isoDateTime(start),
      end: isoDateTime(end),
      location: shift.location || "",
      hours,
      regularHours: round2(regularHours),
      overtimeHours: round2(overtimeHours),
      hourlyRate: rates.hourlyRate,
      overtimeRate: rates.overtimeRate,
      travelKm: rates.travelKmPerShift,
      travelAmount,
      totalAmount: round2(regularHours * rates.hourlyRate + overtimeHours * rates.overtimeRate + travelAmount)
    };
  });
}

function payrollCsv(lines: PayrollLine[]) {
  const header = ["Shift ID", "Worker", "Worker email", "Participant", "Service date", "Start", "End", "Location", "Hours", "Regular hours", "Overtime hours", "Hourly rate", "Overtime rate", "Travel km", "Travel amount", "Total amount"];
  return [header, ...lines.map((line) => [
    line.shiftId,
    line.workerName,
    line.workerEmail,
    line.participantName,
    line.serviceDate,
    line.start,
    line.end,
    line.location,
    line.hours,
    line.regularHours,
    line.overtimeHours,
    line.hourlyRate,
    line.overtimeRate,
    line.travelKm,
    line.travelAmount,
    line.totalAmount
  ])].map((row) => row.map(csvCell).join(",")).join("\n");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function positiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function csvCell(value: unknown) {
  const textValue = String(value ?? "");
  return /[",\n]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
}

function isoDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function isoDateTime(value: Date) {
  return Number.isNaN(value.getTime()) ? "" : value.toISOString();
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value || 0);
}

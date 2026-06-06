import type { SupabaseClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/care-notifications";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { recordServerAudit } from "@/lib/server-audit";

const timeZone = "Australia/Sydney";

export type ContractorInvoiceRates = {
  weekday: number;
  saturday: number;
  sunday: number;
  publicHoliday: number;
};

export type ContractorInvoiceActor = {
  id?: string | null;
  email: string;
  name: string;
  role: string;
};

export type ContractorInvoiceGenerationInput = {
  periodStart: string;
  periodEnd: string;
  rates?: Partial<ContractorInvoiceRates>;
  recipients?: string[];
  sendEmails?: boolean;
  actor: ContractorInvoiceActor;
  trigger: "manual" | "weekly_cron";
};

type ShiftRow = {
  id: string;
  participant_name: string | null;
  support_worker_name: string | null;
  support_worker_email: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  approval_status: string | null;
};

type SupportWorkerRow = {
  name: string | null;
  email: string | null;
  abn?: string | null;
};

type HolidayRow = {
  holiday_date: string;
  name: string | null;
  state: string | null;
};

type ContractorLine = {
  shiftId: string;
  participantName: string;
  serviceDate: string;
  startLabel: string;
  endLabel: string;
  location: string;
  status: string;
  approvalStatus: string;
  dayType: "weekday" | "saturday" | "sunday" | "public_holiday";
  dayTypeLabel: string;
  holidayName: string;
  hours: number;
  rate: number;
  amount: number;
};

type ContractorInvoiceDraft = {
  invoiceNumber: string;
  workerName: string;
  workerEmail: string;
  workerAbn: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  lines: ContractorLine[];
  totalHours: number;
  totalAmount: number;
};

export const defaultContractorRates: ContractorInvoiceRates = {
  weekday: 40,
  saturday: 60,
  sunday: 70,
  publicHoliday: 80
};

export function completedWeekForSydney(referenceDate = todaySydneyDate()) {
  const day = dayOfWeek(referenceDate);
  const daysSinceMonday = (day + 6) % 7;
  const currentWeekMonday = addDays(referenceDate, -daysSinceMonday);
  return {
    periodStart: addDays(currentWeekMonday, -7),
    periodEnd: addDays(currentWeekMonday, -1)
  };
}

export async function listContractorInvoices(client: SupabaseClient) {
  const [invoiceRows, itemRows] = await Promise.all([
    client.from("contractor_invoices").select("*").order("created_at", { ascending: false }).limit(100),
    client.from("contractor_invoice_items").select("*").order("shift_date", { ascending: false }).limit(250)
  ]);

  if (invoiceRows.error) throw new Error(invoiceRows.error.message);
  if (itemRows.error) throw new Error(itemRows.error.message);

  return {
    invoices: invoiceRows.data ?? [],
    items: itemRows.data ?? []
  };
}

export async function generateContractorInvoices(client: SupabaseClient, input: ContractorInvoiceGenerationInput) {
  const periodStart = text(input.periodStart);
  const periodEnd = text(input.periodEnd);
  if (!isDate(periodStart) || !isDate(periodEnd) || periodEnd < periodStart) {
    throw new Error("A valid contractor invoice period start and end date is required.");
  }

  const rates: ContractorInvoiceRates = {
    weekday: positiveNumber(input.rates?.weekday, defaultContractorRates.weekday),
    saturday: positiveNumber(input.rates?.saturday, defaultContractorRates.saturday),
    sunday: positiveNumber(input.rates?.sunday, defaultContractorRates.sunday),
    publicHoliday: positiveNumber(input.rates?.publicHoliday, defaultContractorRates.publicHoliday)
  };

  const existingShiftIds = await loadExistingContractorShiftIds(client);
  const holidays = await loadPublicHolidays(client, periodStart, periodEnd);
  const shifts = await loadInvoiceableShifts(client, periodStart, periodEnd);
  const eligibleShifts = shifts.filter((shift) => {
    const email = text(shift.support_worker_email).toLowerCase();
    const localDate = shift.starts_at ? localDateString(shift.starts_at) : "";
    const status = text(shift.status).toLowerCase();
    return Boolean(email) && localDate >= periodStart && localDate <= periodEnd && !isCancelled(status) && !existingShiftIds.has(shift.id);
  });

  if (!eligibleShifts.length) {
    await recordServerAudit(client, {
      userId: input.actor.id,
      userEmail: input.actor.email,
      userName: input.actor.name,
      userRole: input.actor.role,
      action: "contractor_invoice_no_records",
      tableName: "contractor_invoices",
      recordLabel: `${periodStart} to ${periodEnd}`,
      metadata: { periodStart, periodEnd, trigger: input.trigger }
    });
    return {
      message: "No uninvoiced assigned shifts found for this contractor invoice period.",
      invoiceCount: 0,
      itemCount: 0,
      emailSent: 0,
      emailSkipped: 0,
      totals: { hours: 0, amount: 0 }
    };
  }

  const workerDirectory = await loadWorkerDirectory(client, eligibleShifts.map((shift) => text(shift.support_worker_email).toLowerCase()));
  const drafts = buildDrafts(eligibleShifts, workerDirectory, holidays, periodStart, periodEnd, rates);
  const recipients = input.recipients?.length ? input.recipients : await getAdminNotificationRecipients(client, { fallback: [input.actor.email] });
  const createdIds: string[] = [];
  let itemCount = 0;
  let emailSent = 0;
  let emailSkipped = 0;
  let totalHours = 0;
  let totalAmount = 0;

  for (const draft of drafts) {
    const { data: invoice, error: invoiceError } = await client
      .from("contractor_invoices")
      .insert({
        invoice_number: draft.invoiceNumber,
        worker_name: draft.workerName,
        worker_email: draft.workerEmail,
        worker_abn: draft.workerAbn,
        period_start: draft.periodStart,
        period_end: draft.periodEnd,
        issue_date: draft.issueDate,
        due_date: draft.dueDate,
        total_hours: draft.totalHours,
        total_amount: draft.totalAmount,
        status: input.sendEmails === false ? "generated" : "email_pending",
        email_to: recipients.join(", "),
        generated_by: input.actor.id ?? null,
        generated_by_email: input.actor.email,
        generated_by_name: input.actor.name,
        metadata: {
          rates,
          trigger: input.trigger,
          scheduleSource: "assigned scheduled shifts",
          replyTo: draft.workerEmail
        }
      })
      .select("id")
      .single();

    if (invoiceError) throw new Error(invoiceError.message);

    const invoiceId = String(invoice.id);
    const itemRows = draft.lines.map((line) => ({
      contractor_invoice_id: invoiceId,
      shift_id: line.shiftId,
      participant_name: line.participantName,
      shift_date: line.serviceDate,
      start_time: line.startLabel,
      end_time: line.endLabel,
      location: line.location,
      shift_status: line.status,
      approval_status: line.approvalStatus,
      day_type: line.dayType,
      public_holiday_name: line.holidayName || null,
      hours: line.hours,
      rate: line.rate,
      amount: line.amount
    }));
    const { error: itemError } = await client.from("contractor_invoice_items").insert(itemRows);
    if (itemError) throw new Error(itemError.message);

    let status = "generated";
    if (input.sendEmails !== false) {
      const email = await sendContractorInvoiceEmail(client, draft, recipients);
      emailSent += email.sent ?? 0;
      emailSkipped += email.failed ?? 0;
      status = email.sent ? "emailed" : "email_pending";
      await client
        .from("contractor_invoices")
        .update({ status, emailed_at: email.sent ? new Date().toISOString() : null })
        .eq("id", invoiceId);
    }

    createdIds.push(invoiceId);
    itemCount += itemRows.length;
    totalHours += draft.totalHours;
    totalAmount += draft.totalAmount;
  }

  await createInAppNotification(client, {
    type: "contractor_invoice",
    to: recipients,
    title: "Contractor invoices generated",
    body: `${drafts.length} contractor invoice${drafts.length === 1 ? "" : "s"} generated for ${periodStart} to ${periodEnd}.`,
    linkUrl: "/contractor-invoices",
    metadata: { invoiceIds: createdIds, periodStart, periodEnd, trigger: input.trigger }
  });

  await recordServerAudit(client, {
    userId: input.actor.id,
    userEmail: input.actor.email,
    userName: input.actor.name,
    userRole: input.actor.role,
    action: "contractor_invoice_generate",
    tableName: "contractor_invoices",
    recordLabel: `${drafts.length} contractor invoices generated`,
    metadata: {
      invoiceIds: createdIds,
      periodStart,
      periodEnd,
      itemCount,
      rates,
      trigger: input.trigger,
      emailSent,
      emailSkipped
    }
  });

  return {
    message: `${drafts.length} contractor invoice${drafts.length === 1 ? "" : "s"} generated from ${itemCount} scheduled shift${itemCount === 1 ? "" : "s"}.`,
    invoiceCount: drafts.length,
    itemCount,
    emailSent,
    emailSkipped,
    totals: {
      hours: round2(totalHours),
      amount: round2(totalAmount)
    }
  };
}

async function loadInvoiceableShifts(client: SupabaseClient, periodStart: string, periodEnd: string) {
  const queryStart = `${addDays(periodStart, -1)}T00:00:00.000Z`;
  const queryEnd = `${addDays(periodEnd, 1)}T23:59:59.999Z`;
  const { data, error } = await client
    .from("shifts")
    .select("id, participant_name, support_worker_name, support_worker_email, location, starts_at, ends_at, status, approval_status")
    .gte("starts_at", queryStart)
    .lte("starts_at", queryEnd)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShiftRow[];
}

async function loadExistingContractorShiftIds(client: SupabaseClient) {
  const { data, error } = await client.from("contractor_invoice_items").select("shift_id").not("shift_id", "is", null);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((item: { shift_id?: string | null }) => String(item.shift_id ?? "")).filter(Boolean));
}

async function loadPublicHolidays(client: SupabaseClient, periodStart: string, periodEnd: string) {
  const { data, error } = await client
    .from("public_holidays")
    .select("holiday_date, name, state")
    .gte("holiday_date", periodStart)
    .lte("holiday_date", periodEnd);

  if (error) return new Map<string, HolidayRow>();
  return new Map((data ?? []).map((holiday) => [String(holiday.holiday_date), holiday as HolidayRow]));
}

async function loadWorkerDirectory(client: SupabaseClient, emails: string[]) {
  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (!uniqueEmails.length) return new Map<string, SupportWorkerRow>();

  const withAbn = await client.from("support_workers").select("name, email, abn").in("email", uniqueEmails);
  let rows: SupportWorkerRow[];
  if (withAbn.error) {
    if (!/column .*abn|abn.*does not exist/i.test(withAbn.error.message)) return new Map<string, SupportWorkerRow>();
    const withoutAbn = await client.from("support_workers").select("name, email").in("email", uniqueEmails);
    if (withoutAbn.error) return new Map<string, SupportWorkerRow>();
    rows = (withoutAbn.data ?? []) as SupportWorkerRow[];
  } else {
    rows = (withAbn.data ?? []) as SupportWorkerRow[];
  }
  return new Map(rows.map((worker) => [text(worker.email).toLowerCase(), worker]));
}

function buildDrafts(shifts: ShiftRow[], workers: Map<string, SupportWorkerRow>, holidays: Map<string, HolidayRow>, periodStart: string, periodEnd: string, rates: ContractorInvoiceRates) {
  const grouped = shifts.reduce<Map<string, ShiftRow[]>>((map, shift) => {
    const email = text(shift.support_worker_email).toLowerCase();
    map.set(email, [...(map.get(email) ?? []), shift]);
    return map;
  }, new Map());

  return Array.from(grouped.entries()).map(([workerEmail, rows]) => {
    const worker = workers.get(workerEmail);
    const workerName = text(worker?.name) || text(rows[0]?.support_worker_name) || workerEmail;
    const workerAbn = text(worker?.abn);
    const lines = rows.map((shift) => buildLine(shift, holidays, rates));
    const totalHours = round2(lines.reduce((sum, line) => sum + line.hours, 0));
    const totalAmount = round2(lines.reduce((sum, line) => sum + line.amount, 0));
    const issueDate = todaySydneyDate();
    return {
      invoiceNumber: contractorInvoiceNumber(workerName),
      workerName,
      workerEmail,
      workerAbn,
      periodStart,
      periodEnd,
      issueDate,
      dueDate: addDays(issueDate, 7),
      lines,
      totalHours,
      totalAmount
    };
  });
}

function buildLine(shift: ShiftRow, holidays: Map<string, HolidayRow>, rates: ContractorInvoiceRates): ContractorLine {
  const serviceDate = shift.starts_at ? localDateString(shift.starts_at) : "";
  const holiday = holidays.get(serviceDate);
  const weekday = shift.starts_at ? localWeekday(shift.starts_at) : "";
  const dayType = holiday ? "public_holiday" : weekday === "Saturday" ? "saturday" : weekday === "Sunday" ? "sunday" : "weekday";
  const rate = dayType === "public_holiday" ? rates.publicHoliday : dayType === "saturday" ? rates.saturday : dayType === "sunday" ? rates.sunday : rates.weekday;
  const hours = shiftHours(shift);
  return {
    shiftId: shift.id,
    participantName: text(shift.participant_name) || "Not recorded",
    serviceDate,
    startLabel: shift.starts_at ? timeLabel(shift.starts_at) : "",
    endLabel: shift.ends_at ? timeLabel(shift.ends_at) : "",
    location: text(shift.location),
    status: text(shift.status) || "Scheduled",
    approvalStatus: text(shift.approval_status) || "not_submitted",
    dayType,
    dayTypeLabel: holiday ? `Public holiday${holiday.name ? ` - ${holiday.name}` : ""}` : weekday || "Weekday",
    holidayName: text(holiday?.name),
    hours,
    rate,
    amount: round2(hours * rate)
  };
}

async function sendContractorInvoiceEmail(client: SupabaseClient, draft: ContractorInvoiceDraft, recipients: string[]) {
  return sendCareNotification(client, {
    type: "contractor_invoice",
    to: recipients,
    replyTo: draft.workerEmail,
    subject: `Contractor invoice ${draft.invoiceNumber} - ${draft.workerName}`,
    text: [
      `Contractor invoice: ${draft.invoiceNumber}`,
      `Worker: ${draft.workerName}`,
      `Worker email: ${draft.workerEmail}`,
      `ABN: ${draft.workerAbn || "Not recorded"}`,
      `Period: ${displayDate(draft.periodStart)} to ${displayDate(draft.periodEnd)}`,
      `Total hours: ${draft.totalHours}`,
      `Total amount: ${currency(draft.totalAmount)}`,
      `Open contractor invoices: ${appUrl("/contractor-invoices")}`
    ].join("\n"),
    html: contractorInvoiceHtml(draft),
    metadata: {
      invoiceNumber: draft.invoiceNumber,
      workerEmail: draft.workerEmail,
      workerName: draft.workerName,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      totalHours: draft.totalHours,
      totalAmount: draft.totalAmount
    }
  });
}

function contractorInvoiceHtml(draft: ContractorInvoiceDraft) {
  const rows = draft.lines
    .map((line) => `
      <tr>
        <td style="border-top:1px solid #edf1f8;padding:14px;vertical-align:top;">${escapeHtml(displayDate(line.serviceDate))}</td>
        <td style="border-top:1px solid #edf1f8;padding:14px;vertical-align:top;font-weight:700;">${escapeHtml(line.participantName)}<br><span style="font-weight:400;color:#69758f;">${escapeHtml(line.location || "Location not recorded")}</span></td>
        <td style="border-top:1px solid #edf1f8;padding:14px;vertical-align:top;">${escapeHtml(line.startLabel)} - ${escapeHtml(line.endLabel)}</td>
        <td style="border-top:1px solid #edf1f8;padding:14px;vertical-align:top;">${escapeHtml(line.dayTypeLabel)}</td>
        <td style="border-top:1px solid #edf1f8;padding:14px;text-align:right;vertical-align:top;">${number(line.hours)}</td>
        <td style="border-top:1px solid #edf1f8;padding:14px;text-align:right;vertical-align:top;">${currency(line.rate)}</td>
        <td style="border-top:1px solid #edf1f8;padding:14px;text-align:right;vertical-align:top;"><strong>${currency(line.amount)}</strong></td>
      </tr>
    `)
    .join("");

  return `
    <div style="margin:0;background:#f6f7fb;padding:28px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#172033;">
      <div style="max-width:880px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f4;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08);">
        <div style="background:linear-gradient(135deg,#eef3ff,#f8fbff 55%,#f5fbf9);padding:30px;border-bottom:1px solid #dbe3f4;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="display:inline-block;border-radius:14px;background:#e8edff;color:#4058d6;font-weight:800;padding:10px 13px;margin-bottom:14px;">CareOS</div>
                <h1 style="margin:0;font-size:30px;line-height:1.15;">Support Worker Contractor Invoice</h1>
                <p style="margin:10px 0 0;color:#53627d;font-size:15px;">Scheduled support work for ${escapeHtml(displayDate(draft.periodStart))} to ${escapeHtml(displayDate(draft.periodEnd))}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <p style="margin:0;color:#7a86a0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Invoice number</p>
                <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#172033;">${escapeHtml(draft.invoiceNumber)}</p>
                <p style="margin:12px 0 0;color:#53627d;">Issue date: ${escapeHtml(displayDate(draft.issueDate))}</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:28px;">
          <table style="width:100%;border-collapse:separate;border-spacing:0 12px;margin-bottom:18px;">
            <tr>
              <td style="width:50%;background:#f8fbff;border:1px solid #dbe3f4;border-radius:16px;padding:18px;vertical-align:top;">
                <p style="margin:0 0 8px;color:#7a86a0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Contractor</p>
                <p style="margin:0;font-size:18px;font-weight:800;">${escapeHtml(draft.workerName)}</p>
                <p style="margin:6px 0 0;color:#53627d;">${escapeHtml(draft.workerEmail)}</p>
                <p style="margin:6px 0 0;color:#53627d;">ABN: ${escapeHtml(draft.workerAbn || "Not recorded")}</p>
              </td>
              <td style="width:24px;"></td>
              <td style="width:50%;background:#f8fbff;border:1px solid #dbe3f4;border-radius:16px;padding:18px;vertical-align:top;">
                <p style="margin:0 0 8px;color:#7a86a0;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Payable summary</p>
                <p style="margin:0;font-size:18px;font-weight:800;">${number(draft.totalHours)} hours</p>
                <p style="margin:6px 0 0;color:#53627d;">Due date: ${escapeHtml(displayDate(draft.dueDate))}</p>
                <p style="margin:12px 0 0;font-size:26px;font-weight:900;color:#4058d6;">${currency(draft.totalAmount)}</p>
              </td>
            </tr>
          </table>
          <table style="width:100%;border-collapse:collapse;border:1px solid #dbe3f4;border-radius:16px;overflow:hidden;">
            <thead>
              <tr style="background:#f1f5ff;color:#53627d;text-transform:uppercase;font-size:12px;letter-spacing:.06em;">
                <th style="text-align:left;padding:14px;">Date</th>
                <th style="text-align:left;padding:14px;">Participant / Location</th>
                <th style="text-align:left;padding:14px;">Time</th>
                <th style="text-align:left;padding:14px;">Rate type</th>
                <th style="text-align:right;padding:14px;">Hours</th>
                <th style="text-align:right;padding:14px;">Rate</th>
                <th style="text-align:right;padding:14px;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:#fbfdff;">
                <td colspan="4" style="padding:16px;text-align:right;font-weight:800;">Total</td>
                <td style="padding:16px;text-align:right;font-weight:800;">${number(draft.totalHours)}</td>
                <td></td>
                <td style="padding:16px;text-align:right;font-size:18px;font-weight:900;color:#4058d6;">${currency(draft.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
          <p style="margin:18px 0 0;color:#53627d;font-size:13px;line-height:1.6;">
            Rate rules: weekday ${currency(defaultContractorRates.weekday)}/hr, Saturday ${currency(defaultContractorRates.saturday)}/hr,
            Sunday ${currency(defaultContractorRates.sunday)}/hr, public holiday ${currency(defaultContractorRates.publicHoliday)}/hr unless changed when generated.
          </p>
        </div>
      </div>
    </div>
  `;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function isCancelled(status: string) {
  return status === "cancelled" || status === "canceled";
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftHours(shift: ShiftRow) {
  const start = new Date(shift.starts_at || "");
  const end = new Date(shift.ends_at || "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return round2((end.getTime() - start.getTime()) / 3600000);
}

function contractorInvoiceNumber(workerName: string) {
  const prefix = workerName.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6) || "CON";
  return `CON-${prefix}-${todaySydneyDate().replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function todaySydneyDate() {
  return formatDateParts(new Date());
}

function localDateString(value: string) {
  return formatDateParts(new Date(value));
}

function formatDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function localWeekday(value: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "long" }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function displayDate(value: string) {
  if (!isDate(value)) return value || "Not recorded";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function number(value: number) {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(value || 0);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value || 0);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character] ?? character;
  });
}

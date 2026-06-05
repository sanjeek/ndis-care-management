import { NextResponse } from "next/server";
import { defaultContractorRates, generateContractorInvoices, listContractorInvoices } from "@/lib/contractor-invoices";
import { requireApiUser, requireRole } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "Only admin or team leader users can view contractor invoices." }, { status: 403 });
  }

  try {
    const records = await listContractorInvoices(auth.client);
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Contractor invoices could not be loaded." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can generate contractor invoices." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const result = await generateContractorInvoices(auth.client, {
      periodStart: text(body.period_start),
      periodEnd: text(body.period_end),
      recipients: splitEmails(body.provider_email || body.recipients),
      sendEmails: body.send_email !== false,
      rates: {
        weekday: numberOr(body.weekday_rate, defaultContractorRates.weekday),
        saturday: numberOr(body.saturday_rate, defaultContractorRates.saturday),
        sunday: numberOr(body.sunday_rate, defaultContractorRates.sunday),
        publicHoliday: numberOr(body.public_holiday_rate, defaultContractorRates.publicHoliday)
      },
      actor: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role
      },
      trigger: "manual"
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Contractor invoices could not be generated." }, { status: 400 });
  }
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function splitEmails(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /\S+@\S+\.\S+/.test(email));
}

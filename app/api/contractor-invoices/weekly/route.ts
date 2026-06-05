import { NextResponse } from "next/server";
import { completedWeekForSydney, generateContractorInvoices } from "@/lib/contractor-invoices";
import { getAdminNotificationRecipients } from "@/lib/email-notifications";
import { serviceClient } from "@/lib/server-audit";

export async function GET(request: Request) {
  return runWeeklyContractorInvoices(request);
}

export async function POST(request: Request) {
  return runWeeklyContractorInvoices(request);
}

async function runWeeklyContractorInvoices(request: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_CONTRACTOR_INVOICES !== "true") {
    return NextResponse.json({ message: "Contractor invoices are currently disabled." }, { status: 404 });
  }

  const url = new URL(request.url);
  const cronSecret = process.env.CRON_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret");
  const isCron = request.headers.get("x-vercel-cron") === "1" || url.searchParams.get("cron") === "1";

  if (!isCron) {
    return NextResponse.json({ message: "This endpoint is reserved for the weekly Vercel cron job." }, { status: 403 });
  }
  if (cronSecret && suppliedSecret !== cronSecret) {
    return NextResponse.json({ message: "Invalid cron secret." }, { status: 401 });
  }

  const client = serviceClient();
  if (!client) {
    return NextResponse.json({ message: "Supabase service role key is not configured." }, { status: 500 });
  }

  const { periodStart, periodEnd } = completedWeekForSydney();
  const recipients = await getAdminNotificationRecipients(client);

  try {
    const result = await generateContractorInvoices(client, {
      periodStart,
      periodEnd,
      recipients,
      sendEmails: true,
      actor: {
        id: null,
        email: "vercel-cron",
        name: "Vercel Cron",
        role: "system"
      },
      trigger: "weekly_cron"
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Weekly contractor invoices could not be generated." }, { status: 400 });
  }
}

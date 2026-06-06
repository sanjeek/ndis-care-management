import { NextResponse } from "next/server";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const emailFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return NextResponse.json({
    RESEND_API_KEY: resendKey
      ? resendKey.startsWith("re_")
        ? `OK - set, length ${resendKey.length}`
        : `BAD - set but does not start with re_ (starts with "${resendKey.slice(0, 6)}")`
      : "MISSING",
    EMAIL_FROM: emailFrom ? `OK - ${emailFrom}` : "MISSING (set EMAIL_FROM or RESEND_FROM_EMAIL)",
    SUPABASE_SERVICE_ROLE_KEY: serviceRole ? `OK - length ${serviceRole.length}` : "MISSING",
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `OK - ${supabaseUrl}` : "MISSING",
    NEXT_PUBLIC_SITE_URL: siteUrl ? `OK - ${siteUrl}` : "MISSING",
  });
}

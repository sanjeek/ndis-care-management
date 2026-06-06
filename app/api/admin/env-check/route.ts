import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const resendKey = process.env.RESEND_API_KEY ?? "";
  const emailFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return NextResponse.json({
    RESEND_API_KEY: resendKey
      ? resendKey.startsWith("re_")
        ? `✅ set (starts with re_, length ${resendKey.length})`
        : `⚠️ set but does NOT start with re_ — value starts with "${resendKey.slice(0, 6)}..."`
      : "❌ missing",
    EMAIL_FROM: emailFrom ? `✅ set → ${emailFrom}` : "❌ missing (set EMAIL_FROM or RESEND_FROM_EMAIL)",
    SUPABASE_SERVICE_ROLE_KEY: serviceRole
      ? `✅ set (length ${serviceRole.length})`
      : "❌ missing",
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `✅ ${supabaseUrl}` : "❌ missing",
    NEXT_PUBLIC_SITE_URL: siteUrl ? `✅ ${siteUrl}` : "❌ missing",
  });
}

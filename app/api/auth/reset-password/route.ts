import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appUrl, sendCareNotification } from "@/lib/email-notifications";

export async function POST(request: Request) {
  const { email } = await request.json();
  const cleanEmail = String(email ?? "").trim().toLowerCase();

  if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
    return NextResponse.json({ message: "A valid email address is required." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json({ message: "Server is not configured. Contact your administrator." }, { status: 500 });
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo: appUrl("/reset-password") }
  });

  if (error) {
    // Don't reveal whether the email exists — always show success to the user
    return NextResponse.json({ message: "If that email has an account, a reset link has been sent." });
  }

  const resetLink = data.properties?.action_link;
  if (!resetLink) {
    return NextResponse.json({ message: "If that email has an account, a reset link has been sent." });
  }

  await sendCareNotification(admin, {
    type: "password_reset",
    to: [cleanEmail],
    subject: "Reset your CareOS password",
    text: [
      "You requested a password reset for your CareOS account.",
      "",
      "Click the link below to set a new password:",
      "",
      resetLink,
      "",
      "This link expires in 1 hour. If you did not request a reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:13px;font-weight:600;color:#4b5fe8;margin:0 0 8px">CareOS</p>
        <h1 style="font-size:22px;font-weight:700;color:#172033;margin:0 0 16px">Reset your password</h1>
        <p style="color:#475569;line-height:1.6;margin:0 0 20px">Click the button below to set a new password for your CareOS account. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4b5fe8;color:#fff;font-weight:600;font-size:14px;border-radius:6px;text-decoration:none">
          Reset my password
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">
          If the button doesn&rsquo;t work, copy this link into your browser:<br>
          <a href="${resetLink}" style="color:#4b5fe8;word-break:break-all">${resetLink}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:12px">If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
    metadata: { email: cleanEmail }
  });

  return NextResponse.json({ message: "If that email has an account, a reset link has been sent." });
}

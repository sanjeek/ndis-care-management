import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appUrl, sendCareNotification } from "@/lib/email-notifications";
import { serviceClient } from "@/lib/server-audit";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { requireApiUser, requireRole } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "You do not have permission to invite workers." }, { status: 403 });
  }

  const ip = clientIp(request);
  const ipLimit = await checkRateLimit(`invite-worker:ip:${ip}`, 20, 60 * 60);
  if (!ipLimit.allowed) return rateLimitResponse();

  const { email, name, token } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Diagnose missing env vars upfront with specific messages
  const missing: string[] = [];
  if (!serviceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith("re_")) missing.push("RESEND_API_KEY");
  if (!process.env.EMAIL_FROM && !process.env.RESEND_FROM_EMAIL) missing.push("EMAIL_FROM");

  if (!url || !serviceRole) {
    return NextResponse.json({
      sent: false,
      message: `Worker record saved. Invite email not sent — missing Vercel environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Add these in your Vercel project settings → Environment Variables.`
    });
  }

  const admin = serviceClient() ?? createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

  const loginUrl = appUrl(`/worker-portal/create-login?invite=${token}&email=${encodeURIComponent(email)}&wname=${encodeURIComponent(name)}`);

  const result = await sendCareNotification(admin, {
    type: "worker_invite",
    to: [email],
    subject: "Your CareOS worker portal invite",
    text: [
      `Hi ${name},`,
      "",
      "You have been added as a support worker on CareOS.",
      "",
      "Click the link below to set up your login. Your email address is already filled in — you only need to create a password.",
      "",
      loginUrl,
      "",
      "This link contains your invite code and does not expire. Keep it safe.",
      "",
      "After creating your login, sign in at the worker portal to view your shifts, submit progress notes, and report incidents.",
      "",
      "If you did not expect this email, you can ignore it.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:13px;font-weight:600;color:#4b5fe8;margin:0 0 8px">CareOS Worker Invite</p>
        <h1 style="font-size:22px;font-weight:700;color:#172033;margin:0 0 16px">Welcome, ${name}</h1>
        <p style="color:#475569;line-height:1.6">You have been added as a support worker. Click the button below to create your login &mdash; your email is already filled in, you only need to choose a password.</p>
        <a href="${loginUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#4b5fe8;color:#fff;font-weight:600;font-size:14px;border-radius:6px;text-decoration:none">
          Create my login
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">
          If the button above doesn&rsquo;t work, copy this link into your browser:<br>
          <a href="${loginUrl}" style="color:#4b5fe8;word-break:break-all">${loginUrl}</a>
        </p>
      </div>
    `,
    metadata: { workerEmail: email, workerName: name, inviteToken: token }
  });

  if (result.sent > 0) {
    return NextResponse.json({ sent: true, message: `Invite email sent to ${email}. Worker can set up their login from the link in the email.` });
  }

  const resendError = result.errors?.[0] ?? "Unknown error from Resend.";
  return NextResponse.json({ sent: false, message: `Worker record saved. Invite email failed — Resend said: "${resendError}". Check that your EMAIL_FROM domain is verified in Resend (resend.com → Domains).` });
}

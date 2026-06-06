import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appUrl, sendCareNotification } from "@/lib/email-notifications";
import { serviceClient } from "@/lib/server-audit";

export async function POST(request: Request) {
  const { email, name, token } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json({
      sent: false,
      message: `Worker record saved. Add SUPABASE_SERVICE_ROLE_KEY to send invite emails automatically.`
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

  return NextResponse.json({ sent: false, message: `Worker record saved. Invite email could not be sent (check email configuration). Share this link manually: ${loginUrl}`, inviteUrl: loginUrl });
}

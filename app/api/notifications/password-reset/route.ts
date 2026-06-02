import { NextResponse } from "next/server";
import { appUrl, getAdminNotificationRecipients, sendCareNotification } from "@/lib/email-notifications";
import { serviceClient } from "@/lib/server-audit";

export async function POST(request: Request) {
  const admin = serviceClient();
  if (!admin) {
    return NextResponse.json({ message: "Notification service is not configured." }, { status: 200 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ message: "Reset notification recorded." });
  }

  const recipients = await getAdminNotificationRecipients(admin);
  await sendCareNotification(admin, {
    type: "password_reset",
    to: recipients,
    subject: "Password reset requested",
    text: [
      `A password reset was requested.`,
      `Email: ${email}`,
      `Reset emails are sent by Supabase Auth.`,
      `Sign in page: ${appUrl("/login")}`
    ].join("\n"),
    metadata: { email }
  });

  return NextResponse.json({ message: "Reset notification recorded." });
}

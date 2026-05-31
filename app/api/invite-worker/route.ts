import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email, name, token } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = request.headers.get("origin");
  const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");

  if (!url || !serviceRole) {
    return NextResponse.json({
      sent: false,
      message: `Invite created for ${email}. Add SUPABASE_SERVICE_ROLE_KEY to send the email automatically.`
    });
  }

  const admin = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const redirectTo = `${siteUrl}/worker-portal/create-login?invite=${token}`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      full_name: name,
      role: "support_worker",
      invite_token: token
    }
  });

  if (error) {
    return NextResponse.json({ sent: false, message: `Invite record created, but email failed: ${error.message}` }, { status: 200 });
  }

  return NextResponse.json({ sent: true, message: `Invite email sent to ${email}.` });
}

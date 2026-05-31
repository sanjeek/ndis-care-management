import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email, password, name, organisation, role = "provider_admin", invite } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return NextResponse.json(
      { message: "Supabase URL is not configured." },
      { status: 500 }
    );
  }

  if (!serviceRole) {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) {
      return NextResponse.json({ message: "Supabase anon key is not configured." }, { status: 500 });
    }
    const client = createClient(url, anon);
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          organisation,
          role,
          invite_token: invite
        }
      }
    });
    return NextResponse.json(
      { message: error ? error.message : "Account request submitted. If this email already exists, use sign in or forgot password." },
      { status: error ? 400 : 200 }
    );
  }

  const admin = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      organisation,
      role,
      invite_token: invite
    }
  });

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered");
    return NextResponse.json(
      { message: alreadyExists ? "This email already has an account. Please sign in or use forgot password." : error.message },
      { status: alreadyExists ? 409 : 400 }
    );
  }

  return NextResponse.json({
    userId: data.user?.id,
    message: "Account created. You can now sign in."
  });
}

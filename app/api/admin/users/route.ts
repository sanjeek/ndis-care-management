import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeRole, roleForUser, friendlyRole } from "@/lib/auth";
import { recordServerAudit } from "@/lib/server-audit";
import { appUrl, sendCareNotification } from "@/lib/email-notifications";

type AdminAction = "create" | "status" | "password" | "role";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return { error: "Supabase URL or service role key is not configured." };
  }

  return {
    client: createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  };
}

function hasAdminClient(result: ReturnType<typeof adminClient>): result is { client: NonNullable<ReturnType<typeof adminClient>["client"]> } {
  return "client" in result && Boolean(result.client);
}

async function requireAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!url || !anon || !token) {
    return { error: "Admin session is required.", status: 401 };
  }

  const client = createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    return { error: "Admin session is invalid.", status: 401 };
  }

  let role = roleForUser(data.user.user_metadata?.role, data.user.email);
  if (!data.user.user_metadata?.role) {
    const admin = adminClient();
    if (hasAdminClient(admin)) {
      const { data: profile } = await admin.client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      role = roleForUser(profile?.role, data.user.email);
    }
  }
  if (role !== "admin") {
    return { error: "Only admin users can manage accounts.", status: 403 };
  }

  return {
    userId: data.user.id,
    userEmail: data.user.email ?? "",
    userName: String(data.user.user_metadata?.full_name || data.user.email || data.user.id),
    userRole: role
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin(request);
  if ("error" in adminCheck) {
    return NextResponse.json({ message: adminCheck.error }, { status: adminCheck.status });
  }

  const admin = adminClient();
  if ("error" in admin) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }

  const { data, error } = await admin.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const users = data.users.map((user) => ({
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.full_name || user.email || user.id),
    role: roleForUser(user.user_metadata?.role, user.email),
    active: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
    createdAt: user.created_at
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin(request);
  if ("error" in adminCheck) {
    return NextResponse.json({ message: adminCheck.error }, { status: adminCheck.status });
  }

  const admin = adminClient();
  if ("error" in admin) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }

  const body = await request.json();
  const action = body.action as AdminAction;

  if (action === "create") {
    const role = normalizeRole(body.role);
    const password = String(body.password ?? "").trim();
    const email = String(body.email ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!email || !name || password.length < 6) {
      return NextResponse.json({ message: "Name, email, and a temporary password of at least 6 characters are required." }, { status: 400 });
    }

    const { data, error } = await admin.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        organisation: String(body.organisation ?? "Worker portal"),
        role
      }
    });

    if (error) {
      const alreadyExists = error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered");
      return NextResponse.json(
        { message: alreadyExists ? "This email already has an account." : error.message },
        { status: alreadyExists ? 409 : 400 }
      );
    }

    if (data.user) {
      await admin.client.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: name,
        organisation: String(body.organisation ?? "Worker portal"),
        role,
        active: true
      });
      await recordServerAudit(admin.client, {
        userId: adminCheck.userId,
        userEmail: adminCheck.userEmail,
        userName: adminCheck.userName,
        userRole: adminCheck.userRole,
        action: "create",
        tableName: "auth.users",
        recordId: data.user.id,
        recordLabel: email,
        metadata: { recordType: "user_login", role }
      });

      const loginUrl = appUrl("/login");
      const roleLabel = friendlyRole(role);
      await sendCareNotification(admin.client, {
        type: "user_account_created",
        to: [email],
        subject: "Your CareOS account is ready",
        text: [
          `Hi ${name},`,
          "",
          "Your CareOS account has been created. Use the details below to sign in.",
          "",
          `Email:     ${email}`,
          `Password:  ${password}`,
          `Role:      ${roleLabel}`,
          "",
          `Sign in at: ${loginUrl}`,
          "",
          "Please change your password after your first login.",
          "",
          "If you did not expect this email, please contact your administrator.",
        ].join("\n"),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <p style="font-size:13px;font-weight:600;color:#4b5fe8;margin:0 0 8px">CareOS</p>
            <h1 style="font-size:22px;font-weight:700;color:#172033;margin:0 0 16px">Your account is ready, ${name}</h1>
            <p style="color:#475569;line-height:1.6;margin:0 0 20px">Your CareOS login has been created. Use the details below to sign in.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;width:120px">Email</td><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#172033;font-weight:600">${email}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#64748b">Password</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#172033;font-weight:600">${password}</td></tr>
              <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b">Role</td><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#172033">${roleLabel}</td></tr>
            </table>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#4b5fe8;color:#fff;font-weight:600;font-size:14px;border-radius:6px;text-decoration:none">Sign in to CareOS</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">Please change your password after your first login. If you did not expect this email, contact your administrator.</p>
          </div>
        `,
        metadata: { userId: data.user.id, role }
      });
    }

    return NextResponse.json({ message: `Account created. Login details sent to ${email}.`, userId: data.user?.id });
  }

  return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin(request);
  if ("error" in adminCheck) {
    return NextResponse.json({ message: adminCheck.error }, { status: adminCheck.status });
  }

  const admin = adminClient();
  if ("error" in admin) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }

  const body = await request.json();
  const action = body.action as AdminAction;
  const userId = String(body.userId ?? "");

  if (!userId) {
    return NextResponse.json({ message: "User ID is required." }, { status: 400 });
  }

  if (action === "status") {
    const active = Boolean(body.active);
    const { error } = await admin.client.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h"
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    await admin.client.from("profiles").update({ active, updated_at: new Date().toISOString() }).eq("id", userId);
    await recordServerAudit(admin.client, {
      userId: adminCheck.userId,
      userEmail: adminCheck.userEmail,
      userName: adminCheck.userName,
      userRole: adminCheck.userRole,
      action: "update",
      tableName: "profiles",
      recordId: userId,
      recordLabel: userId,
      metadata: { field: "active", active }
    });
    return NextResponse.json({ message: active ? "User activated." : "User deactivated." });
  }

  if (action === "password") {
    const password = String(body.password ?? "").trim();
    if (password.length < 6) {
      return NextResponse.json({ message: "Temporary password must be at least 6 characters." }, { status: 400 });
    }
    const { error } = await admin.client.auth.admin.updateUserById(userId, { password });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await recordServerAudit(admin.client, {
      userId: adminCheck.userId,
      userEmail: adminCheck.userEmail,
      userName: adminCheck.userName,
      userRole: adminCheck.userRole,
      action: "update",
      tableName: "auth.users",
      recordId: userId,
      recordLabel: userId,
      metadata: { field: "password", operation: "temporary_password_reset" }
    });
    return NextResponse.json({ message: "Temporary password reset." });
  }

  if (action === "role") {
    const role = normalizeRole(body.role);
    const { data: existing, error: getError } = await admin.client.auth.admin.getUserById(userId);
    if (getError || !existing.user) {
      return NextResponse.json({ message: getError?.message ?? "User not found." }, { status: 404 });
    }

    const { error } = await admin.client.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existing.user.user_metadata,
        role
      }
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });

    await admin.client.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
    await recordServerAudit(admin.client, {
      userId: adminCheck.userId,
      userEmail: adminCheck.userEmail,
      userName: adminCheck.userName,
      userRole: adminCheck.userRole,
      action: "update",
      tableName: "profiles",
      recordId: userId,
      recordLabel: existing.user.email ?? userId,
      metadata: { field: "role", role }
    });
    return NextResponse.json({ message: "User role updated." });
  }

  return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
}

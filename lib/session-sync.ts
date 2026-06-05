"use client";

import { type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function syncServerSession(role?: UserRole) {
  if (!supabase) return false;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return false;

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, role })
  });

  return response.ok;
}

export async function clearServerSession() {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
}

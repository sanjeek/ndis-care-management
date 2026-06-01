"use client";

import { supabase } from "@/lib/supabase";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "incident_report"
  | "progress_note"
  | "participant_update"
  | "invoice_action";

export type AuditPayload = {
  action: AuditAction | string;
  tableName?: string;
  recordId?: string;
  recordLabel?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(payload: AuditPayload) {
  if (!supabase) return;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return;

  await fetch("/api/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  }).catch(() => {
    // Audit failure should not block care work in the UI.
  });
}

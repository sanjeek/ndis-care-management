import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuditInput = {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  tableName?: string | null;
  recordId?: string | null;
  recordLabel?: string | null;
  metadata?: Record<string, unknown>;
};

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) return null;

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function recordServerAudit(client: SupabaseClient, input: AuditInput) {
  await client.from("audit_logs").insert({
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    user_name: input.userName ?? null,
    user_role: input.userRole ?? null,
    action: input.action,
    table_name: input.tableName ?? null,
    record_id: input.recordId ?? null,
    record_label: input.recordLabel ?? null,
    metadata: input.metadata ?? {}
  });
}

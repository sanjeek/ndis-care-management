import { NextResponse } from "next/server";
import { adminServiceClient, hasAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { recordServerAudit } from "@/lib/server-audit";

const restoreOrder = [
  "profiles",
  "participants",
  "support_workers",
  "worker_invitations",
  "shifts",
  "progress_notes",
  "progress_note_templates",
  "incident_reports",
  "participant_tasks",
  "module_records",
  "invoices",
  "invoice_items",
  "care_plans",
  "medication_records",
  "medication_events",
  "ndis_funding_records",
  "service_agreements",
  "care_documents",
  "internal_conversations",
  "internal_messages",
  "audit_logs"
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdminSession(request);
  if ("error" in adminCheck) {
    return NextResponse.json({ message: adminCheck.error }, { status: adminCheck.status });
  }

  const admin = adminServiceClient();
  if (!hasAdminServiceClient(admin)) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }

  const { id } = await context.params;
  const { data: backup, error } = await admin.client
    .from("backup_logs")
    .select("id, status, storage_bucket, storage_path, file_name, table_counts")
    .eq("id", id)
    .maybeSingle();

  if (error || !backup || backup.status !== "completed" || !backup.storage_path) {
    return NextResponse.json({ message: "Completed backup not found." }, { status: 404 });
  }

  const download = await admin.client.storage.from(backup.storage_bucket).download(backup.storage_path);
  if (download.error || !download.data) {
    return NextResponse.json({ message: download.error?.message ?? "Could not read backup file." }, { status: 400 });
  }

  const snapshot = JSON.parse(await download.data.text()) as { schemaVersion?: number; tables?: Record<string, unknown[]> };
  const tableCounts = Object.fromEntries(
    restoreOrder.map((table) => [table, Array.isArray(snapshot.tables?.[table]) ? snapshot.tables[table].length : 0])
  );

  await recordServerAudit(admin.client, {
    userId: adminCheck.userId,
    userEmail: adminCheck.userEmail,
    userName: adminCheck.userName,
    userRole: adminCheck.userRole,
    action: "database_restore_plan",
    tableName: "backup_logs",
    recordId: backup.id,
    recordLabel: backup.file_name,
    metadata: { tableCounts, schemaVersion: snapshot.schemaVersion ?? null }
  });

  return NextResponse.json({
    backupId: backup.id,
    fileName: backup.file_name,
    schemaVersion: snapshot.schemaVersion ?? null,
    tableCounts,
    restoreOrder,
    procedure: [
      "1. Download the backup JSON from the admin backup page.",
      "2. Create a fresh Supabase project or maintenance window before restoring production data.",
      "3. Restore auth users separately if required, then restore public tables in the listed order.",
      "4. Re-upload private storage files separately; this database backup stores storage metadata only.",
      "5. Run validation checks on participants, staff, shifts, incidents, invoices, and documents before reopening user access."
    ]
  });
}

import { NextResponse } from "next/server";
import { adminServiceClient, hasAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { recordServerAudit } from "@/lib/server-audit";

const backupBucket = "database-backups";
const backupTables = [
  "participants",
  "profiles",
  "family_members",
  "support_workers",
  "worker_invitations",
  "worker_availability",
  "worker_leave_requests",
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
  "app_notifications",
  "internal_conversations",
  "internal_messages",
  "email_notifications",
  "audit_logs"
];

async function authoriseBackupRun(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(request.url).searchParams.get("secret");
  if (request.headers.get("x-vercel-cron") === "1") {
    if (cronSecret && suppliedSecret !== cronSecret) {
      return { error: "Invalid cron secret.", status: 401 };
    }
    return {
      userId: null,
      userEmail: "vercel-cron",
      userName: "Vercel Cron",
      userRole: "system",
      startedBy: "daily-cron"
    };
  }

  const admin = await requireAdminSession(request);
  if ("error" in admin) return admin;
  return { ...admin, startedBy: admin.userEmail };
}

async function runBackup(request: Request) {
  const auth = await authoriseBackupRun(request);
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  const admin = adminServiceClient();
  if (!hasAdminServiceClient(admin)) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }
  const startedBy = "startedBy" in auth ? auth.startedBy : auth.userEmail;

  const started = await admin.client
    .from("backup_logs")
    .insert({
      status: "running",
      started_by: startedBy
    })
    .select("id")
    .single();

  if (started.error || !started.data) {
    return NextResponse.json({ message: started.error?.message ?? "Could not start backup log." }, { status: 400 });
  }

  const backupId = started.data.id;
  const createdAt = new Date().toISOString();

  try {
    const tables: Record<string, unknown[]> = {};
    const tableCounts: Record<string, number> = {};

    for (const table of backupTables) {
      const { data, error } = await admin.client.from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      tables[table] = data ?? [];
      tableCounts[table] = data?.length ?? 0;
    }

    const payload = {
      schemaVersion: 1,
      backupId,
      createdAt,
      source: "careos-ndis",
      tables
    };
    const json = JSON.stringify(payload, null, 2);
    const fileName = `careos-backup-${createdAt.replace(/[:.]/g, "-")}.json`;
    const storagePath = `daily/${fileName}`;
    const bytes = new TextEncoder().encode(json);

    const upload = await admin.client.storage.from(backupBucket).upload(storagePath, bytes, {
      contentType: "application/json",
      upsert: false
    });

    if (upload.error) throw new Error(upload.error.message);

    await admin.client
      .from("backup_logs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        storage_bucket: backupBucket,
        storage_path: storagePath,
        file_name: fileName,
        size_bytes: bytes.byteLength,
        table_counts: tableCounts,
        error_message: null
      })
      .eq("id", backupId);

    await recordServerAudit(admin.client, {
      userId: auth.userId,
      userEmail: auth.userEmail,
      userName: auth.userName,
      userRole: auth.userRole,
      action: "database_backup",
      tableName: "backup_logs",
      recordId: backupId,
      recordLabel: fileName,
      metadata: { tableCounts, storagePath, automated: startedBy === "daily-cron" }
    });

    return NextResponse.json({ message: "Database backup completed.", backupId, tableCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await admin.client
      .from("backup_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message
      })
      .eq("id", backupId);

    await recordServerAudit(admin.client, {
      userId: auth.userId,
      userEmail: auth.userEmail,
      userName: auth.userName,
      userRole: auth.userRole,
      action: "database_backup_failed",
      tableName: "backup_logs",
      recordId: backupId,
      recordLabel: backupId,
      metadata: { error: message, automated: startedBy === "daily-cron" }
    });

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runBackup(request);
}

export async function POST(request: Request) {
  return runBackup(request);
}

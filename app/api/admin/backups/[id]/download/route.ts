import { NextResponse } from "next/server";
import { adminServiceClient, hasAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { recordServerAudit } from "@/lib/server-audit";

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
    .select("id, status, storage_bucket, storage_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !backup || backup.status !== "completed" || !backup.storage_path) {
    return NextResponse.json({ message: "Completed backup not found." }, { status: 404 });
  }

  const signed = await admin.client.storage.from(backup.storage_bucket).createSignedUrl(backup.storage_path, 120, {
    download: backup.file_name ?? "database-backup.json"
  });

  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ message: signed.error?.message ?? "Could not create backup download link." }, { status: 400 });
  }

  await recordServerAudit(admin.client, {
    userId: adminCheck.userId,
    userEmail: adminCheck.userEmail,
    userName: adminCheck.userName,
    userRole: adminCheck.userRole,
    action: "database_backup_download",
    tableName: "backup_logs",
    recordId: backup.id,
    recordLabel: backup.file_name,
    metadata: { signedUrlSeconds: 120 }
  });

  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 120 });
}

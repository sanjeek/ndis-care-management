import { NextResponse } from "next/server";
import { adminServiceClient, hasAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);
  if ("error" in adminCheck) {
    return NextResponse.json({ message: adminCheck.error }, { status: adminCheck.status });
  }

  const admin = adminServiceClient();
  if (!hasAdminServiceClient(admin)) {
    return NextResponse.json({ message: admin.error }, { status: 500 });
  }

  const { data, error } = await admin.client
    .from("backup_logs")
    .select("id, created_at, completed_at, status, storage_bucket, storage_path, file_name, size_bytes, table_counts, started_by, error_message")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ backups: data ?? [] });
}

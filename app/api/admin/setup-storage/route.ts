import { NextResponse } from "next/server";
import { adminServiceClient, hasAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { recordServerAudit } from "@/lib/server-audit";

export async function POST(request: Request) {
  const auth = await requireAdminSession(request);
  if ("error" in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const client = adminServiceClient();
  if (!hasAdminServiceClient(client)) return NextResponse.json({ message: client.error }, { status: 500 });

  const { error } = await client.client.storage.createBucket("database-backups", {
    public: false,
    allowedMimeTypes: ["application/json"],
    fileSizeLimit: 52428800 // 50 MB
  });

  const alreadyExists = error?.message?.toLowerCase().includes("already exist");
  if (error && !alreadyExists) {
    return NextResponse.json({ message: `Failed to create storage bucket: ${error.message}` }, { status: 500 });
  }

  await recordServerAudit(client.client, {
    userId: auth.userId,
    userEmail: auth.userEmail,
    userName: auth.userName,
    userRole: auth.userRole,
    action: "setup_storage_bucket",
    tableName: "storage",
    recordLabel: "database-backups",
    metadata: { alreadyExists }
  });

  return NextResponse.json({
    message: alreadyExists
      ? "Storage bucket already exists. Backups are ready to run."
      : "Storage bucket 'database-backups' created. Backups can now run successfully."
  });
}

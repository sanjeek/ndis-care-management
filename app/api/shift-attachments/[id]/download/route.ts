import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const { data: attachment, error } = await auth.client.from("shift_attachments").select("*").eq("id", id).maybeSingle();
  if (error || !attachment) return NextResponse.json({ message: error?.message ?? "Attachment not found." }, { status: 404 });

  const canManage = requireRole(auth.user, ["admin", "team_leader"]);
  const isAssigned = String(attachment.support_worker_email ?? "").toLowerCase() === auth.user.email.toLowerCase();
  if (!canManage && !isAssigned) {
    return NextResponse.json({ message: "You do not have permission to open this shift attachment." }, { status: 403 });
  }

  const signed = await auth.client.storage.from(String(attachment.storage_bucket)).createSignedUrl(String(attachment.storage_path), 120, {
    download: String(attachment.file_name ?? "shift-attachment")
  });
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ message: signed.error?.message ?? "Could not create secure download link." }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "document_access",
    tableName: "shift_attachments",
    recordId: String(attachment.id),
    recordLabel: String(attachment.title ?? attachment.file_name ?? ""),
    metadata: { shiftId: attachment.shift_id, signedUrlSeconds: 120 }
  });

  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 120 });
}

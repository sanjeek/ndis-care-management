import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type AgreementPdfRecord = {
  id: string;
  participant_name: string;
  ndis_number: string | null;
  title: string;
  version_number: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  renewal_reminder_at: string | null;
  support_categories: string | null;
  funding_summary: string | null;
  terms: string;
  participant_signature: string | null;
  participant_signed_at: string | null;
  signed_by_name: string | null;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin", "team_leader"])) {
    return NextResponse.json({ message: "You do not have permission to download service agreements." }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: agreement, error } = await auth.client
    .from("service_agreements")
    .select("*")
    .eq("id", id)
    .maybeSingle<AgreementPdfRecord>();

  if (error || !agreement) {
    return NextResponse.json({ message: error?.message ?? "Service agreement not found." }, { status: 404 });
  }

  const bytes = createAgreementPdf(agreement);
  await auth.client.from("service_agreements").update({ pdf_generated_at: new Date().toISOString() }).eq("id", id);
  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "service_agreement_pdf_download",
    tableName: "service_agreements",
    recordId: agreement.id,
    recordLabel: agreement.title,
    metadata: { participantName: agreement.participant_name, versionNumber: agreement.version_number }
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(agreement)}"`
    }
  });
}

function createAgreementPdf(agreement: AgreementPdfRecord) {
  const lines = [
    "CareOS NDIS Service Agreement",
    agreement.title,
    `Participant: ${agreement.participant_name}`,
    `NDIS number: ${agreement.ndis_number || "Not recorded"}`,
    `Version: ${agreement.version_number}`,
    `Status: ${agreement.status}`,
    `Agreement period: ${agreement.start_date || "Not recorded"} to ${agreement.end_date || "Not recorded"}`,
    `Renewal reminder: ${agreement.renewal_reminder_at || "Not recorded"}`,
    "",
    "Support categories",
    agreement.support_categories || "Not recorded",
    "",
    "Funding summary",
    agreement.funding_summary || "Not recorded",
    "",
    "Agreement terms",
    agreement.terms,
    "",
    "Participant signature",
    agreement.participant_signature ? `${agreement.participant_signature} (${agreement.signed_by_name || agreement.participant_name})` : "Not signed",
    `Signed at: ${agreement.participant_signed_at || "Not signed"}`
  ];
  return simplePdf(lines);
}

function simplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 790 Td",
    "16 TL",
    ...wrapLines(lines).map((line) => `(${escapePdf(line)}) Tj T*`),
    "ET"
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function wrapLines(lines: string[]) {
  const wrapped: string[] = [];
  lines.forEach((line) => {
    const value = line || " ";
    for (let index = 0; index < value.length; index += 82) {
      wrapped.push(value.slice(index, index + 82));
    }
  });
  return wrapped.slice(0, 46);
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function fileName(agreement: AgreementPdfRecord) {
  const safeTitle = `${agreement.participant_name}-${agreement.title}-v${agreement.version_number}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safeTitle || "service-agreement"}.pdf`;
}

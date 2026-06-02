import { NextResponse } from "next/server";
import { requireApiUser, requireRole } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type TemplateField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "dropdown" | "signature";
  required: boolean;
  options?: string[];
};

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  if (!requireRole(auth.user, ["admin"])) {
    return NextResponse.json({ message: "Only admin users can create progress note templates." }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const category = String(body.category ?? "General").trim() || "General";
  const requiredFields = parseLines(body.required_fields);
  const dropdownLabel = String(body.dropdown_label ?? "").trim();
  const dropdownOptions = parseOptions(body.dropdown_options);
  const outcomeFields = parseLines(body.outcome_fields);
  const requiresSignature = Boolean(body.requires_signature ?? true);
  const status = String(body.status ?? "active").trim().toLowerCase() === "archived" ? "archived" : "active";

  if (!name) {
    return NextResponse.json({ message: "Template name is required." }, { status: 400 });
  }

  const fieldSchema: TemplateField[] = requiredFields.map((label, index) => ({
    id: slug(`field-${index + 1}-${label}`),
    label,
    type: label.toLowerCase().includes("detail") || label.toLowerCase().includes("note") ? "textarea" : "text",
    required: true
  }));

  if (dropdownLabel && dropdownOptions.length) {
    fieldSchema.push({
      id: slug(`dropdown-${dropdownLabel}`),
      label: dropdownLabel,
      type: "dropdown",
      required: true,
      options: dropdownOptions
    });
  }

  if (requiresSignature) {
    fieldSchema.push({
      id: "digital_signature",
      label: "Digital signature",
      type: "signature",
      required: true
    });
  }

  const outcomeSchema = outcomeFields.map((label, index) => ({
    id: slug(`outcome-${index + 1}-${label}`),
    label,
    type: "textarea",
    required: true
  }));

  const { data: template, error } = await auth.client
    .from("progress_note_templates")
    .insert({
      name,
      description,
      category,
      field_schema: fieldSchema,
      outcome_schema: outcomeSchema,
      requires_signature: requiresSignature,
      status,
      created_by: auth.user.id,
      created_by_email: auth.user.email
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "progress_note_template_create",
    tableName: "progress_note_templates",
    recordId: template.id,
    recordLabel: name,
    metadata: { category, fieldCount: fieldSchema.length, outcomeCount: outcomeSchema.length, requiresSignature, status }
  });

  return NextResponse.json({ message: "Progress note template saved.", id: template.id });
}

function parseLines(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptions(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || crypto.randomUUID();
}

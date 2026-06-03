import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireApiUser } from "@/lib/api-auth";
import { recordServerAudit } from "@/lib/server-audit";

type ConversationRow = {
  id: string;
  subject: string;
  participant_emails: string[];
  participant_names: string[];
  created_by_email: string | null;
  last_message_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;
  const email = auth.user.email.toLowerCase();

  const [profiles, conversations] = await Promise.all([
    auth.client
      .from("profiles")
      .select("id, email, full_name, role, active")
      .eq("active", true)
      .order("full_name", { ascending: true }),
    auth.client
      .from("internal_conversations")
      .select("*")
      .contains("participant_emails", [email])
      .order("last_message_at", { ascending: false, nullsFirst: false })
  ]);

  if (profiles.error) return NextResponse.json({ message: profiles.error.message }, { status: 400 });
  if (conversations.error) return NextResponse.json({ message: conversations.error.message }, { status: 400 });

  const conversationRows = (conversations.data ?? []) as ConversationRow[];
  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const messages = conversationIds.length
    ? await auth.client
        .from("internal_messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (messages.error) return NextResponse.json({ message: messages.error.message }, { status: 400 });

  return NextResponse.json({
    currentUser: auth.user,
    users: (profiles.data ?? [])
      .filter((profile) => String(profile.email ?? "").toLowerCase() !== email)
      .map((profile) => ({
        id: String(profile.id ?? ""),
        email: String(profile.email ?? "").toLowerCase(),
        name: String(profile.full_name || profile.email || ""),
        role: String(profile.role ?? "")
      })),
    conversations: conversationRows,
    messages: messages.data ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const action = String(body.action ?? "send");
  const senderEmail = auth.user.email.toLowerCase();

  if (action === "create") {
    const subject = String(body.subject ?? "").trim();
    const bodyText = String(body.body ?? "").trim();
    const recipients = Array.isArray(body.recipients) ? body.recipients.map((item: unknown) => String(item).trim().toLowerCase()).filter(Boolean) : [];
    const participantEmails = Array.from(new Set([senderEmail, ...recipients]));
    if (!subject || !bodyText || participantEmails.length < 2) {
      return NextResponse.json({ message: "Subject, message, and at least one recipient are required." }, { status: 400 });
    }

    const participantNames = await namesForEmails(auth.client, participantEmails);
    const now = new Date().toISOString();
    const { data: conversation, error } = await auth.client
      .from("internal_conversations")
      .insert({
        subject,
        participant_emails: participantEmails,
        participant_names: participantNames,
        created_by: auth.user.id,
        created_by_email: senderEmail,
        last_message_at: now
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const messageResult = await insertMessage(auth.client, conversation.id, auth.user, bodyText);
    if (messageResult.error) return NextResponse.json({ message: messageResult.error.message }, { status: 400 });

    await recordServerAudit(auth.client, {
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "internal_message_create",
      tableName: "internal_conversations",
      recordId: conversation.id,
      recordLabel: subject,
      metadata: { participantCount: participantEmails.length }
    });

    return NextResponse.json({ message: "Internal conversation created.", id: conversation.id });
  }

  const conversationId = String(body.conversationId ?? "").trim();
  const message = String(body.body ?? "").trim();
  if (!conversationId || !message) {
    return NextResponse.json({ message: "Conversation and message are required." }, { status: 400 });
  }

  const { data: conversation, error } = await auth.client
    .from("internal_conversations")
    .select("id, subject, participant_emails")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; subject: string; participant_emails: string[] }>();
  if (error || !conversation) return NextResponse.json({ message: error?.message ?? "Conversation not found." }, { status: 404 });
  if (!conversation.participant_emails.map((item) => item.toLowerCase()).includes(senderEmail)) {
    return NextResponse.json({ message: "You can only message conversations you belong to." }, { status: 403 });
  }

  const inserted = await insertMessage(auth.client, conversationId, auth.user, message);
  if (inserted.error) return NextResponse.json({ message: inserted.error.message }, { status: 400 });
  await auth.client.from("internal_conversations").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);

  await recordServerAudit(auth.client, {
    userId: auth.user.id,
    userEmail: auth.user.email,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "internal_message_send",
    tableName: "internal_messages",
    recordLabel: conversation.subject,
    metadata: { conversationId }
  });

  return NextResponse.json({ message: "Message sent." });
}

async function namesForEmails(client: SupabaseClient, emails: string[]) {
  const { data } = await client.from("profiles").select("email, full_name").in("email", emails);
  const names = new Map((data ?? []).map((profile) => [String(profile.email ?? "").toLowerCase(), String(profile.full_name || profile.email || "")]));
  return emails.map((email) => names.get(email) || email);
}

async function insertMessage(client: SupabaseClient, conversationId: string, user: { id: string; email: string; name: string; role: string }, body: string) {
  return client.from("internal_messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    sender_email: user.email.toLowerCase(),
    sender_name: user.name,
    sender_role: user.role,
    body,
    read_by_emails: [user.email.toLowerCase()]
  });
}

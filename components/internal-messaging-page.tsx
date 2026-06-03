"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { friendlyRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type MessageUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Conversation = {
  id: string;
  subject: string;
  participant_emails: string[];
  participant_names: string[];
  last_message_at: string;
  created_at: string;
};

type InternalMessage = {
  id: string;
  conversation_id: string;
  sender_email: string;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
};

export function InternalMessagingPage() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [users, setUsers] = useState<MessageUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("Loading internal messages.");

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const threadMessages = useMemo(
    () => messages.filter((message) => message.conversation_id === selected?.id),
    [messages, selected?.id]
  );

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening messages.");
      return;
    }
    const response = await fetch("/api/messages", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({ message: "Messages could not be loaded." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setCurrentEmail(String(result.currentUser?.email ?? "").toLowerCase());
    setUsers(result.users ?? []);
    setConversations(result.conversations ?? []);
    setMessages(result.messages ?? []);
    setSelectedId((current) => current || result.conversations?.[0]?.id || "");
    setNotice(result.conversations?.length ? "Secure internal conversations loaded." : "No internal conversations yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recipients = form.getAll("recipients").map((item) => String(item));
    const ok = await postMessage({
      action: "create",
      subject: String(form.get("subject")),
      body: String(form.get("body")),
      recipients
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const ok = await postMessage({
      action: "send",
      conversationId: selected.id,
      body: String(form.get("body"))
    });
    if (ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function postMessage(payload: Record<string, unknown>) {
    if (!supabase) return false;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before sending messages.");
      return false;
    }
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ message: "Message could not be sent." }));
    setNotice(result.message);
    return response.ok;
  }

  return (
    <AppShell title="Internal Messages" eyebrow={notice}>
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <section className="space-y-6">
          <Panel title="New internal message">
            <form onSubmit={createConversation} className="grid gap-4">
              <Field name="subject" label="Subject" placeholder="Shift question, participant update, coordination note" />
              <label>
                <span className="mb-2 block text-sm font-medium text-slate-700">Recipients</span>
                <select name="recipients" required multiple size={Math.min(8, Math.max(3, users.length))} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                  {users.map((user) => (
                    <option key={user.email} value={user.email}>{user.name} - {friendlyRole(user.role)}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">Hold Ctrl to select multiple recipients. Messages stay inside the app.</span>
              </label>
              <Area name="body" label="Message" placeholder="Write the internal message." />
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
                <Send className="h-4 w-4" />
                Start conversation
              </button>
            </form>
          </Panel>

          <Panel title="Conversations">
            {conversations.length ? (
              <div className="grid gap-2">
                {conversations.map((conversation) => (
                  <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`rounded border p-3 text-left text-sm ${conversation.id === selected?.id ? "border-gumleaf bg-gumleaf/5" : "border-slate-200 bg-slate-50 hover:bg-white"}`}>
                    <p className="font-semibold text-ink">{conversation.subject}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{conversation.participant_names?.join(", ")}</p>
                    <p className="mt-2 text-xs text-slate-400">{conversation.last_message_at ? dateLabel(conversation.last_message_at) : dateLabel(conversation.created_at)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <Empty title="No conversations" message="Create an internal conversation to message admin, coordinators, or support workers." />
            )}
          </Panel>
        </section>

        <section className="rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">{selected?.subject || "Select a conversation"}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected?.participant_names?.join(", ") || "No conversation selected"}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-gumleaf" />
            </div>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-4">
            {selected ? (
              threadMessages.length ? (
                <div className="grid gap-3">
                  {threadMessages.map((message) => {
                    const mine = message.sender_email?.toLowerCase() === currentEmail;
                    return (
                      <article key={message.id} className={`max-w-[88%] rounded p-3 text-sm ${mine ? "ml-auto bg-gumleaf text-white" : "bg-slate-100 text-slate-700"}`}>
                        <p className={`text-xs font-semibold ${mine ? "text-white/80" : "text-slate-500"}`}>{message.sender_name || message.sender_email} | {friendlyRole(message.sender_role)}</p>
                        <p className="mt-2 whitespace-pre-wrap leading-6">{message.body}</p>
                        <p className={`mt-2 text-xs ${mine ? "text-white/70" : "text-slate-400"}`}>{dateLabel(message.created_at)}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty title="No messages yet" message="Send the first message in this conversation." />
              )
            ) : (
              <Empty title="No conversation selected" message="Choose a conversation or start a new one." />
            )}
          </div>
          {selected ? (
            <form onSubmit={sendMessage} className="border-t border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <textarea name="body" required rows={2} placeholder="Reply inside the app" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
                <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d]">
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        <MessageSquare className="h-5 w-5 text-gumleaf" />
      </div>
      {children}
    </section>
  );
}

function Field({ name, label, placeholder = "" }: { name: string; label: string; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} required placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Area({ name, label, placeholder = "" }: { name: string; label: string; placeholder?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea name={name} required rows={4} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{message}</p>
    </div>
  );
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Not recorded";
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

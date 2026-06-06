"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, FileUp, Paperclip, ShieldCheck, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ShiftOption = {
  id: string;
  participant_name: string;
  support_worker_name: string | null;
  starts_at: string | null;
};

type AttachmentRecord = {
  id: string;
  shift_id: string;
  participant_name: string;
  support_worker_name: string | null;
  title: string;
  attachment_type: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
};

export function ShiftAttachmentsPage() {
  const [notice, setNotice] = useState("");
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setNotice("Supabase is not connected.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening shift attachments.");
      return;
    }
    const response = await fetch("/api/shift-attachments", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Could not load shift attachments." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    setShifts(result.shifts ?? []);
    setAttachments(result.attachments ?? []);
    setNotice(result.attachments?.length ? "" : "No shift attachments uploaded yet.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before uploading.");
      return;
    }
    const response = await fetch("/api/shift-attachments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: new FormData(event.currentTarget)
    });
    const result = await response.json().catch(() => ({ message: "Upload failed." }));
    setNotice(result.message);
    if (response.ok) {
      event.currentTarget.reset();
      await refresh();
    }
  }

  async function openAttachment(id: string) {
    if (!supabase) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setNotice("Please sign in again before opening attachments.");
      return;
    }
    const response = await fetch(`/api/shift-attachments/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({ message: "Could not open attachment." }));
    if (!response.ok) {
      setNotice(result.message);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell title="Shift Attachments" eyebrow={notice}>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Attachments" value={String(attachments.length)} icon={Paperclip} />
        <Metric title="Available shifts" value={String(shifts.length)} icon={ShieldCheck} />
        <Metric title="Storage" value="Private" icon={FileUp} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Upload shift attachment</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Files are stored in private Supabase storage and opened with permission-checked signed links.</p>
          <form onSubmit={upload} className="mt-4 grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Shift</span>
              <select name="shiftId" required className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>{shift.participant_name} | {shift.support_worker_name || "Open"} | {dateLabel(shift.starts_at)}</option>
                ))}
              </select>
            </label>
            <Field name="title" label="Attachment title" placeholder="Shift photo, consent form, receipt, handover file" />
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Attachment type</span>
              <select name="attachmentType" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                <option value="general">General</option>
                <option value="receipt">Travel or purchase receipt</option>
                <option value="handover">Handover evidence</option>
                <option value="participant_signature">Participant signature</option>
                <option value="photo_evidence">Photo evidence</option>
              </select>
            </label>
            <input name="file" type="file" required className="w-full rounded border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-gumleaf file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-gumleaf/10 border border-gumleaf/20 px-4 py-3 text-sm font-semibold text-gumleaf hover:bg-gumleaf/20">
              <FileUp className="h-4 w-4" />
              Upload securely
            </button>
          </form>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink">Secure attachment register</h2>
          <div className="mt-4 grid gap-3">
            {attachments.length ? attachments.map((attachment) => (
              <article key={attachment.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-ink">{attachment.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{attachment.participant_name} | {attachment.support_worker_name || "Open shift"}</p>
                    <p className="mt-1 text-xs text-slate-500">{attachment.file_name} | {formatBytes(attachment.size_bytes)} | {dateLabel(attachment.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => void openAttachment(attachment.id)} className="inline-flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                    <Download className="h-4 w-4" />
                    Open
                  </button>
                </div>
              </article>
            )) : (
              <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No secure shift attachments have been uploaded yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className="rounded bg-gumleaf/10 p-2 text-gumleaf"><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </section>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} required placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

function dateLabel(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

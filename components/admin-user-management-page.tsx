"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { friendlyRole, type UserRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
};

export function AdminUserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState("Create and manage staff login access.");
  const [loading, setLoading] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/users", {
      headers: await authHeaders()
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.message ?? "Could not load users.");
      return;
    }

    setUsers(result.users ?? []);
    setMessage("Admin user management ready.");
  }, [authHeaders]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        action: "create",
        name: String(form.get("name")),
        email: String(form.get("email")),
        organisation: String(form.get("organisation")),
        role: String(form.get("role")),
        password: String(form.get("password"))
      })
    });
    const result = await response.json();
    setLoading(false);
    setMessage(result.message ?? "User action complete.");
    if (response.ok) {
      event.currentTarget.reset();
      await loadUsers();
    }
  }

  async function updateUser(payload: Record<string, unknown>) {
    setLoading(true);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setLoading(false);
    setMessage(result.message ?? "User updated.");
    if (response.ok) await loadUsers();
  }

  return (
    <AppShell title="User Management" eyebrow={message}>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-gumleaf" />
            <h2 className="font-semibold text-ink">Create support worker login</h2>
          </div>
          <form onSubmit={createUser} className="mt-5 grid gap-4">
            <Field name="name" label="Full name" defaultValue="" placeholder="Full name" />
            <Field name="email" label="Email address" type="email" defaultValue="" placeholder="worker@example.com" />
            <Field name="organisation" label="Organisation" defaultValue="Worker portal" />
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
              <select name="role" defaultValue="support_worker" className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15">
                <option value="support_worker">Support worker</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Field name="password" label="Temporary password" defaultValue="" placeholder="Temporary password" />
            <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded bg-gumleaf px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d625d] disabled:opacity-70">
              <UserPlus className="h-4 w-4" />
              Create account
            </button>
          </form>
        </section>

        <section className="rounded border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-gumleaf" />
              <h2 className="font-semibold text-ink">User accounts</h2>
            </div>
            <button onClick={loadUsers} disabled={loading} className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-subtle">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <UserRow key={user.id} user={user} disabled={loading} onUpdate={updateUser} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function UserRow({ user, disabled, onUpdate }: { user: ManagedUser; disabled: boolean; onUpdate: (payload: Record<string, unknown>) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user.role);

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <p className="font-semibold text-ink">{user.name}</p>
        <p className="text-slate-500">{user.email}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="rounded border border-slate-200 bg-white px-2 py-2 text-sm text-ink">
            <option value="support_worker">Support worker</option>
            <option value="admin">Admin</option>
          </select>
          <button disabled={disabled || role === user.role} onClick={() => onUpdate({ action: "role", userId: user.id, role })} className="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{friendlyRole(user.role)}</p>
      </td>
      <td className="px-4 py-4">
        <span className={`rounded px-2.5 py-1 text-xs font-semibold ${user.active ? "bg-gumleaf/10 text-gumleaf" : "bg-coral/10 text-coral"}`}>
          {user.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="grid gap-2">
          <button disabled={disabled} onClick={() => onUpdate({ action: "status", userId: user.id, active: !user.active })} className="rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {user.active ? "Deactivate" : "Activate"}
          </button>
          <div className="flex gap-2">
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 rounded border border-slate-200 px-2 py-2 text-xs text-ink outline-none focus:border-gumleaf" />
            <button disabled={disabled} onClick={() => onUpdate({ action: "password", userId: user.id, password })} className="inline-flex items-center gap-1 rounded bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              <KeyRound className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Field({ name, label, defaultValue, placeholder = "", type = "text" }: { name: string; label: string; defaultValue: string; placeholder?: string; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} type={type} required defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gumleaf focus:ring-2 focus:ring-gumleaf/15" />
    </label>
  );
}

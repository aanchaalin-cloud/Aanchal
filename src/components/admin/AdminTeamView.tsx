"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Shield, Plus, Trash2, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type AdminRow = {
  id: string;
  email: string;
  role: "admin" | "superadmin";
  created_at: string;
};

export default function AdminTeamView() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "superadmin">("admin");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (data.success) setAdmins(data.data ?? []);
      else setMessage({ ok: false, text: data.error ?? "Failed to load team." });
    } catch {
      setMessage({ ok: false, text: "Failed to load team." });
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ ok: true, text: `${email} added as ${role}.` });
        setEmail("");
        await fetchAdmins();
      } else {
        setMessage({ ok: false, text: data.error ?? "Failed to add admin." });
      }
    } catch {
      setMessage({ ok: false, text: "Failed to add admin." });
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (id: string) => {
    if (!confirm("Remove this user from the admin team?")) return;
    setRemoving(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ ok: true, text: "Admin removed." });
        await fetchAdmins();
      } else {
        setMessage({ ok: false, text: data.error ?? "Failed to remove admin." });
      }
    } catch {
      setMessage({ ok: false, text: "Failed to remove admin." });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Team & Roles</h1>
        <p className="mt-1 text-sm text-stone-600">
          Manage who can access the admin panel. Super admins manage the team.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-sm border px-4 py-3 text-sm ${
            message.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={addAdmin}
        className="flex flex-col gap-3 rounded-sm border border-stone-200 bg-white p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-600">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <p className="mt-1 text-[11px] text-stone-500">
            The account must already exist (they must have signed up).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "superadmin")}
            className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 sm:w-44"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-1.5 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>

      {loading ? (
        <p className="py-10 text-center text-sm text-stone-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-900">{a.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        a.role === "superadmin"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {a.role === "superadmin" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <Shield className="h-3 w-3" />
                      )}
                      {a.role === "superadmin" ? "Super Admin" : "Admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeAdmin(a.id)}
                      disabled={removing === a.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {removing === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

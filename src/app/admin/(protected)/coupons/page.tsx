"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

type FormData = {
  code: string;
  description: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  per_customer_limit: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const emptyForm: FormData = {
  code: "",
  description: "",
  discount_type: "fixed",
  discount_value: 0,
  min_order_amount: "",
  max_discount_amount: "",
  usage_limit: "",
  per_customer_limit: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) setCoupons(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount?.toString() ?? "",
      max_discount_amount: coupon.max_discount_amount?.toString() ?? "",
      usage_limit: coupon.usage_limit?.toString() ?? "",
      per_customer_limit: coupon.per_customer_limit?.toString() ?? "",
      start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : "",
      end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : "",
      is_active: coupon.is_active,
    });
    setEditingId(coupon.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    setError("");
    const discountValue = form.discount_value;
    if (!form.code.trim()) { setError("Coupon code is required"); return; }
    if (discountValue < 1) { setError("Discount value must be at least 1"); return; }
    if (form.discount_type === "percentage" && discountValue > 100) { setError("Percentage discount cannot exceed 100%"); return; }

    const body = {
      code: form.code,
      description: form.description || undefined,
      discount_type: form.discount_type,
      discount_value: discountValue,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_customer_limit: form.per_customer_limit ? Number(form.per_customer_limit) : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/coupons/${editingId}`
        : "/api/admin/coupons";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        resetForm();
        fetchCoupons();
      } else {
        setError(data.error ?? "Failed to save coupon");
      }
    } catch {
      setError("Unable to complete the request right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    const body = {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      is_active: !coupon.is_active,
    };

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) fetchCoupons();
    } catch {
      // silent
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Deactivate coupon "${coupon.code}"? It will be soft-deleted.`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchCoupons();
    } catch {
      // silent
    }
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.end_date) return false;
    return new Date(coupon.end_date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Coupons</h1>
          <p className="text-sm text-stone-600 mt-1">{coupons.length} total coupons</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(""); }}
            className="inline-flex items-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Coupon
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-sm border border-stone-200 bg-white p-6">
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            {editingId ? "Edit Coupon" : "New Coupon"}
          </h2>

          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-stone-600 mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME10"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as "fixed" | "percentage" })}
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              >
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Value *</label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Math.max(0, Number(e.target.value)) })}
                min={1}
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description for internal use"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Min Order Amount (₹)</label>
              <input
                type="number"
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                placeholder="Optional"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Max Discount (₹)</label>
              <input
                type="number"
                value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                placeholder="Optional"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Usage Limit</label>
              <input
                type="number"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Unlimited"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Per Customer Limit</label>
              <input
                type="number"
                value={form.per_customer_limit}
                onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })}
                placeholder="Default: 1"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">Active</span>
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
            </button>
            <button
              onClick={resetForm}
              className="rounded border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      {loading ? (
        <p className="text-sm text-stone-600 py-8 text-center">Loading...</p>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-sm">
          <p className="text-stone-600">No coupons created yet.</p>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError(""); }}
            className="mt-4 inline-flex items-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Coupon
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <div className="min-w-full">
          <table className="w-full divide-y divide-stone-100">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Min Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Validity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.map((coupon) => {
                const expired = isExpired(coupon);
                return (
                  <tr key={coupon.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-stone-900">{coupon.code}</span>
                      {coupon.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-stone-900">
                        {coupon.discount_type === "fixed" ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                      </span>
                      {coupon.max_discount_amount && coupon.discount_type === "percentage" && (
                        <p className="text-xs text-stone-500">Max ₹{coupon.max_discount_amount}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {coupon.min_order_amount ? `₹${coupon.min_order_amount}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {coupon.usage_limit ? `${coupon.usage_limit}x` : "∞"}
                      {coupon.per_customer_limit && coupon.per_customer_limit !== 1 && (
                        <p className="text-xs text-stone-500">{coupon.per_customer_limit}/customer</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-stone-600">
                        {coupon.start_date && (
                          <p>From {new Date(coupon.start_date).toLocaleDateString("en-IN")}</p>
                        )}
                        {coupon.end_date && (
                          <p>To {new Date(coupon.end_date).toLocaleDateString("en-IN")}</p>
                        )}
                        {!coupon.start_date && !coupon.end_date && (
                          <span className="text-stone-400">No expiry</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          coupon.is_active && !expired
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-100 text-stone-600"
                        }`}>
                          {coupon.is_active ? (expired ? "Expired" : "Active") : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(coupon)}
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                          title={coupon.is_active ? "Deactivate" : "Activate"}
                        >
                          {coupon.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-stone-400" />}
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Deactivate (soft-delete)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

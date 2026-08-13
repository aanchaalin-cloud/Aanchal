"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { LayoutGrid, Plus, Pencil, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: number;
  created_at: string;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
  sort_order: "0",
};

function generateSlugFrom(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (c: CategoryRow) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      is_active: c.is_active,
      sort_order: c.sort_order.toString(),
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || generateSlugFrom(form.name),
        description: form.description || null,
        image_url: form.image_url || null,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };

      const res = editing
        ? await fetch(`/api/admin/categories/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to save category.");
        return;
      }
      setShowForm(false);
      load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: CategoryRow) => {
    setBusyId(c.id);
    try {
      await fetch(`/api/admin/categories/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      load();
    } catch {
      // silent
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: CategoryRow) => {
    if (!window.confirm(`Delete category "${c.name}"? Products keep their category name but will no longer appear in the category picker.`)) return;
    setBusyId(c.id);
    try {
      await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      load();
    } catch {
      // silent
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Categories</h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage the store category catalog. Renaming a category also updates all products in it.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      {error && showForm && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-sm border border-stone-200 bg-white p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: editing ? f.slug : f.slug || generateSlugFrom(name),
                }));
              }}
              required
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generated"
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Image URL</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://... (optional)"
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="catActive"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-stone-300"
            />
            <label htmlFor="catActive" className="text-sm text-stone-700">Active</label>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Create Category"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-stone-600">Loading...</p>
      ) : categories.length === 0 ? (
        <div className="rounded-sm border border-stone-200 bg-white py-16 text-center">
          <LayoutGrid className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm text-stone-600">No categories yet. Create your first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <div className="min-w-[760px]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.image_url ? (
                        <div className="relative h-10 w-8 overflow-hidden rounded-sm bg-stone-100">
                          <Image src={c.image_url} alt={c.name} fill sizes="32px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-8 items-center justify-center rounded-sm bg-stone-100 text-stone-400">
                          <LayoutGrid className="h-4 w-4" />
                        </div>
                      )}
                      <p className="font-medium text-stone-900">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{c.slug}</td>
                  <td className="px-4 py-3 text-stone-600">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {c.product_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {busyId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          c.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                        {c.is_active ? "Active" : "Inactive"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

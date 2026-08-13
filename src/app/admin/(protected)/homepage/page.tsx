"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2, Check, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionEditor } from "@/components/admin/homepage/SectionEditor";
import {
  getAvailableSectionKeys,
  getSectionDefinition,
  type HomepageSectionContent,
} from "@/lib/homepage-sections";

type SectionRow = {
  id: string;
  section_key: string;
  title: string;
  is_active: boolean;
  sort_order: number;
  content: HomepageSectionContent;
};

export default function AdminHomepagePage() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SectionRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage-sections");
      const data = await res.json();
      if (data.success) setSections(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!addKey) return;
    const definition = getSectionDefinition(addKey);
    if (!definition) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_key: addKey,
          title: definition.label,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to add section.");
        return;
      }
      setAddKey("");
      load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (title: string, content: HomepageSectionContent) => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/homepage-sections/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to save section.");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (section: SectionRow) => {
    setBusyId(section.id);
    try {
      await fetch(`/api/admin/homepage-sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !section.is_active }),
      });
      load();
    } catch {
      // silent
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setSections(next);
    try {
      await fetch("/api/admin/homepage-sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((s) => s.id) }),
      });
    } catch {
      // silent — reload to resync
      load();
    }
  };

  const handleDelete = async (section: SectionRow) => {
    if (!window.confirm(`Remove "${section.title}" from the homepage? This only hides the section; it does not delete any products.`)) return;
    setBusyId(section.id);
    try {
      await fetch(`/api/admin/homepage-sections/${section.id}`, { method: "DELETE" });
      if (editing?.id === section.id) setEditing(null);
      load();
    } catch {
      // silent
    } finally {
      setBusyId(null);
    }
  };

  const available = getAvailableSectionKeys(sections.map((s) => s.section_key));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Homepage Sections</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Add, remove, reorder and edit the sections on the storefront homepage. Changes appear
            on the site within a minute.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ExternalLink className="h-4 w-4" />
          View site
        </a>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add section */}
      <div className="flex flex-wrap items-end gap-3 rounded-sm border border-stone-200 bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-700">
            Add a section type not already on the homepage
          </label>
          <select
            value={addKey}
            onChange={(e) => setAddKey(e.target.value)}
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="">Choose a section…</option>
            {available.map((def) => (
              <option key={def.key} value={def.key}>{def.label}</option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={handleAdd} loading={adding} disabled={!addKey}>
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Editor */}
      {editing && (
        <SectionEditor
          key={editing.id}
          sectionKey={editing.section_key}
          initialTitle={editing.title}
          initialContent={editing.content ?? {}}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
        />
      )}

      {/* List */}
      {loading ? (
        <p className="py-10 text-center text-sm text-stone-600">Loading...</p>
      ) : sections.length === 0 ? (
        <div className="rounded-sm border border-stone-200 bg-white py-16 text-center">
          <LayoutTemplate className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm text-stone-600">No sections yet. Add one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-stone-200 bg-white">
          <ul className="divide-y divide-stone-100">
            {sections.map((section, index) => {
              const def = getSectionDefinition(section.section_key);
              return (
                <li
                  key={section.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${section.is_active ? "" : "opacity-60"}`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === sections.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">{section.title}</p>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        {def?.label ?? section.section_key}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">{def?.description ?? ""}</p>
                  </div>

                  {busyId === section.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleActive(section)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        section.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      {section.is_active ? "Visible" : "Hidden"}
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(section);
                        setError(null);
                      }}
                      disabled={!def?.hasContent}
                      className={`flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-30`}
                      aria-label={`Edit ${section.title}`}
                      title={def?.hasContent ? "Edit content" : "This section has no editable content"}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(section)}
                      className="flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${section.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  getSectionDefinition,
  type HomepageSectionContent,
  type SectionFieldDef,
  type SectionItemFieldDef,
} from "@/lib/homepage-sections";
import { ICON_NAMES } from "@/lib/section-icons";
import { Button } from "@/components/ui/Button";

type ItemShape = Record<string, string | number | null>;

type EditorProps = {
  sectionKey: string;
  initialTitle: string;
  initialContent: HomepageSectionContent;
  saving: boolean;
  error: string | null;
  onSave: (title: string, content: HomepageSectionContent) => Promise<void>;
  onCancel: () => void;
};

function ImageFieldInput({
  field,
  value,
  onChange,
}: {
  field: SectionFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-section-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      onChange(data.data.url);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
      </div>
      {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
      {value.trim() && (
        <p className="mt-1 truncate text-xs text-stone-500">{value}</p>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: SectionFieldDef | SectionItemFieldDef;
  value: string;
  onChange: (v: string | number) => void;
}) {
  const base = "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900";

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={base}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        min={0}
        max={5}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={base}
      />
    );
  }

  if (field.type === "icon") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Default</option>
        {ICON_NAMES.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    );
  }

  if (field.type === "image") {
    return <ImageFieldInput field={field as SectionFieldDef} value={value} onChange={(v) => onChange(v)} />;
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

export function SectionEditor({
  sectionKey,
  initialTitle,
  initialContent,
  saving,
  error,
  onSave,
  onCancel,
}: EditorProps) {
  const definition = getSectionDefinition(sectionKey);
  const [title, setTitle] = useState(initialTitle);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const field of definition?.fields ?? []) {
      v[field.name] = (initialContent[field.name as keyof HomepageSectionContent] as string) ?? "";
    }
    return v;
  });
  const [items, setItems] = useState<ItemShape[]>(() =>
    (initialContent.items ?? []).map((item) => {
      const shape: ItemShape = {};
      for (const f of definition?.itemFields ?? []) {
        const raw = item[f.name as keyof typeof item];
        shape[f.name] = raw == null ? "" : (raw as string | number);
      }
      return shape;
    })
  );

  if (!definition) {
    return <p className="text-sm text-red-600">Unknown section type.</p>;
  }

  const itemFields = definition.itemFields ?? [];

  const setField = (name: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [name]: String(value) }));
  };

  const setItemField = (index: number, name: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [name]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      Object.fromEntries((definition?.itemFields ?? []).map((f) => [f.name, ""])),
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content: Record<string, unknown> = {};
    for (const field of definition?.fields ?? []) {
      const v = values[field.name];
      if (v !== undefined && v !== "") content[field.name] = v;
    }
    const itemFields = definition?.itemFields ?? [];
    if (itemFields.length) {
      content.items = items
        .map((item) => {
          const clean: ItemShape = {};
          for (const f of itemFields) {
            const v = item[f.name];
            if (f.type === "number") {
              const num = Number(v);
              clean[f.name] = v === "" || Number.isNaN(num) ? null : num;
            } else {
              clean[f.name] = typeof v === "string" && v === "" ? null : (v ?? null);
            }
          }
          return clean;
        })
        .filter((item) => Object.values(item).some((v) => v != null && v !== ""));
    }
    await onSave(title.trim() || definition.label, content as HomepageSectionContent);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-sm border border-stone-200 bg-white p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-700">
            Section name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-stone-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <p className="mt-1 text-xs text-stone-500">{definition.description}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {definition.hasContent && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {definition.fields.map((field) => (
            <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-stone-700">
                {field.label}
              </label>
              <FieldInput
                field={field}
                value={values[field.name] ?? ""}
                onChange={(v) => setField(field.name, v)}
              />
              {field.help && <p className="mt-1 text-xs text-stone-500">{field.help}</p>}
            </div>
          ))}
        </div>
      )}

      {definition.hasContent && itemFields.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">
              {definition.itemsLabel ?? "Items"}
            </h3>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4" />
              {definition.itemAddLabel ?? "Add item"}
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">No items yet.</p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="rounded-sm border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500">
                    Item {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {itemFields.map((field) => (
                    <div
                      key={field.name}
                      className={field.type === "textarea" ? "sm:col-span-2" : ""}
                    >
                      <label className="mb-1 block text-xs font-medium text-stone-700">
                        {field.label}
                      </label>
                      <FieldInput
                        field={field}
                        value={String(item[field.name] ?? "")}
                        onChange={(v) => setItemField(index, field.name, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

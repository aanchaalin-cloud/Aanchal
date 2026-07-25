"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { generateSlug } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import type { ProductWithDetails, VariantFormData } from "@/types";

type ImageItem = {
  id?: string;
  url: string;
  file?: File;
};

type Props = {
  product?: ProductWithDetails;
  mode: "create" | "edit";
};

export function ProductForm({ product, mode }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [discountPrice, setDiscountPrice] = useState(
    product?.discount_price?.toString() ?? ""
  );
  const [fabric, setFabric] = useState(product?.fabric ?? "");
  const [washCare, setWashCare] = useState(product?.wash_care ?? "");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  const [variants, setVariants] = useState<VariantFormData[]>(
    product?.product_variants?.map((v) => ({
      id: v.id,
      size: v.size ?? "",
      color: v.color ?? "",
      color_hex: v.color_hex ?? "",
      sku: v.sku ?? "",
      stock: v.stock,
    })) ?? [{ size: "", color: "", color_hex: "", sku: "", stock: 0 }]
  );

  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  useEffect(() => {
    if (product?.product_images) {
      setImages(
        product.product_images
          .sort((a, b) => a.position - b.position)
          .map((img) => ({ id: img.id, url: img.url }))
      );
    }
  }, [product]);

  useEffect(() => {
    if (mode === "create" && name) {
      setSlug(generateSlug(name));
    }
  }, [name, mode]);

  const addVariant = () => {
    setVariants((prev) => [...prev, { size: "", color: "", color_hex: "", sku: "", stock: 0 }]);
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: keyof VariantFormData, value: string | number) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: ImageItem[] = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    const item = images[idx];
    if (item.file) {
      URL.revokeObjectURL(item.url);
    }
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImageUp = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveImageDown = (idx: number) => {
    setImages((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const buildPayload = () => ({
    name,
    slug,
    description: description || null,
    category,
    price: parseFloat(price),
    discount_price: discountPrice ? parseFloat(discountPrice) : null,
    fabric: fabric || null,
    wash_care: washCare || null,
    is_featured: isFeatured,
    is_active: isActive,
    images: [] as string[], // filled per-mode
    variants: variants.map((v) => ({
      id: v.id || undefined,
      size: v.size || null,
      color: v.color || null,
      color_hex: v.color_hex || null,
      sku: v.sku || null,
      stock: v.stock,
    })),
  });

  const uploadNewFiles = async (
    productId: string,
    fileItems: ImageItem[]
  ): Promise<string[]> => {
    const urls: string[] = [];
    for (const item of fileItems) {
      if (!item.file) continue;
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("productId", productId);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? Messages.adminImageUploadError);
      }
      urls.push(data.data.url);
    }
    return urls;
  };

  const deleteRemovedImages = async (
    removedIds: string[]
  ): Promise<void> => {
    for (const imageId of removedIds) {
      try {
        await fetch("/api/admin/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }),
        });
      } catch {
        // non-blocking — best effort storage cleanup
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        // === CREATE MODE ===
        // Step 1: Create product (without images)
        const payload = buildPayload();
        payload.images = [];

        const createRes = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const createData = await createRes.json();

        if (!createRes.ok || !createData.success) {
          setError(createData.error ?? Messages.adminCreateProductError);
          setLoading(false);
          return;
        }

        const newProductId = createData.data.id;

        // Step 2: Upload any selected files
        const newFiles = images.filter((img) => img.file);
        if (newFiles.length > 0) {
          setUploadProgress(true);
          const uploadedUrls = await uploadNewFiles(newProductId, newFiles);

          // Step 3: Update product with image URLs for correct positions
          const allUrls = [...images.map((img) => img.url)];

          for (let i = 0; i < images.length; i++) {
            if (images[i].file && uploadedUrls.length > 0) {
              allUrls[i] = uploadedUrls.shift()!;
            }
          }

          const updatePayload = buildPayload();
          updatePayload.images = allUrls;

          await fetch(`/api/admin/products/${newProductId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
        }
      } else if (mode === "edit" && product) {
        // === EDIT MODE ===
        // Step 1: Upload new files
        const newFiles = images.filter((img) => img.file);
        if (newFiles.length > 0) {
          setUploadProgress(true);
        }
        const uploadedUrls = await uploadNewFiles(product.id, newFiles);

        // Step 2: Determine removed existing images
        const initialImageIds =
          product.product_images?.map((img) => img.id) ?? [];
        const currentIds = images
          .filter((img) => img.id)
          .map((img) => img.id!);
        const removedIds = initialImageIds.filter(
          (id) => !currentIds.includes(id)
        );

        // Step 3: Delete removed images from storage (best-effort)
        await deleteRemovedImages(removedIds);

        // Step 4: Build final URL list (existing kept + new uploads)
        let uploadIndex = 0;
        const finalUrls = images.map((img) => {
          if (img.file) {
            return uploadedUrls[uploadIndex++];
          }
          return img.url;
        });

        // Step 5: Update product with all data + image URLs (handles DB row positions)
        const payload = buildPayload();
        payload.images = finalUrls;

        const updateRes = await fetch(
          `/api/admin/products/${product.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const updateData = await updateRes.json();

        if (!updateRes.ok || !updateData.success) {
          setError(updateData.error ?? Messages.adminUpdateProductError);
          setLoading(false);
          return;
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : Messages.genericError
      );
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <section className="space-y-4 rounded-sm border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900">Basic Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Product Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Slug *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Category *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="e.g. Sarees, Kurtas" className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-4 rounded-sm border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Price (₹) *</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Discount Price (₹)</label>
            <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} min="0" placeholder="Leave empty for no discount" className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="space-y-4 rounded-sm border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900">Product Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Fabric</label>
            <input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="e.g. Pure Silk" className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Wash Care</label>
            <input value={washCare} onChange={(e) => setWashCare(e.target.value)} placeholder="e.g. Dry clean only" className="w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded border-stone-300" />
            <label htmlFor="isFeatured" className="text-sm text-stone-700">Featured Product</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-stone-300" />
            <label htmlFor="isActive" className="text-sm text-stone-700">Active (visible on store)</label>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4 rounded-sm border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Images</h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            + Add Images
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleAddFiles}
          className="hidden"
        />

        {images.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded border-2 border-dashed border-stone-300 p-8 text-center text-sm text-stone-600 hover:border-stone-500 hover:text-stone-600 transition-colors"
          >
            Click to upload images (JPEG, PNG, WebP — max 5 MB each)
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={`${img.id ?? "new"}-${idx}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-50"
            >
              <Image
                src={img.url}
                alt={`Product image ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
              {img.file && (
                <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  New
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-[#1C1C1C]/0 opacity-0 transition-all group-hover:bg-[#1C1C1C]/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => moveImageUp(idx)}
                  disabled={idx === 0}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/90 text-stone-700 hover:bg-white disabled:opacity-30 text-xs"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveImageDown(idx)}
                  disabled={idx >= images.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white/90 text-stone-700 hover:bg-white disabled:opacity-30 text-xs"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-red-500 text-white hover:bg-red-600 text-xs"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="absolute bottom-1 left-1 rounded bg-[#1C1C1C]/60 px-1.5 py-0.5 text-[10px] text-white">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-600">
          Images are uploaded to Supabase Storage. The first image is used as the product thumbnail.
          Allowed: JPEG, PNG, WebP — max 5 MB each.
        </p>
      </section>

      {/* Variants */}
      <section className="space-y-4 rounded-sm border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-stone-900">Variants (Size/Color/Stock)</h2>
          <button type="button" onClick={addVariant} className="text-sm text-stone-600 hover:text-stone-900">+ Add Variant</button>
        </div>
        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-6 items-end rounded border border-stone-100 p-3">
              <div>
                <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Size</label>
                <input value={v.size} onChange={(e) => updateVariant(idx, "size", e.target.value)} placeholder="S/M/L/XL" className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Color</label>
                <input value={v.color} onChange={(e) => updateVariant(idx, "color", e.target.value)} placeholder="Navy Blue" className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Color Hex</label>
                <input value={v.color_hex} onChange={(e) => updateVariant(idx, "color_hex", e.target.value)} placeholder="#1e3a5f" className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-stone-600 mb-0.5">SKU</label>
                <input value={v.sku} onChange={(e) => updateVariant(idx, "sku", e.target.value)} placeholder="SKU-001" className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Stock</label>
                <input type="number" value={v.stock} onChange={(e) => updateVariant(idx, "stock", parseInt(e.target.value) || 0)} min="0" className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900" />
              </div>
              <div className="flex items-center justify-center">
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button type="submit" loading={loading}>
          {uploadProgress
            ? "Uploading images…"
            : mode === "create"
            ? "Create Product"
            : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
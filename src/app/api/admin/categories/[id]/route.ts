import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100).optional(),
  slug: z.string().min(1, "Slug is required").max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().url("Invalid image URL").max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(99999).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const data = await validateRequest(request, updateSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", id)
    .single();
  if (existingError || !existing) {
    return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
  }

  if (data.slug) {
    const { data: dup } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ success: false, error: "A category with this slug already exists." }, { status: 409 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.description !== undefined) patch.description = data.description;
  if (data.image_url !== undefined) patch.image_url = data.image_url;
  if (data.is_active !== undefined) patch.is_active = data.is_active;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;

  const { data: updated, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to update category." }, { status: 500 });
  }

  // Keep products.category text in sync when the category is renamed.
  if (data.name && data.name.trim() !== existing.name) {
    await supabase
      .from("products")
      .update({ category: data.name.trim() })
      .eq("category", existing.name);
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, error: "Unable to delete category." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

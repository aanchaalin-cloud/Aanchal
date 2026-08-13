import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(120),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().url("Invalid image URL").max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(99999).optional(),
});

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();

  const [{ data: categories, error: catError }, { data: products }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("products").select("category"),
    ]);

  if (catError) {
    return NextResponse.json({ success: false, error: "Unable to load categories." }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const p of products ?? []) {
    if (!p.category) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }

  const data = (categories ?? []).map((c) => ({
    ...c,
    product_count: counts[c.name] ?? 0,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, categorySchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: dup } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", data.slug)
    .maybeSingle();
  if (dup) {
    return NextResponse.json({ success: false, error: "A category with this slug already exists." }, { status: 409 });
  }

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      name: data.name.trim(),
      slug: data.slug,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to create category." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

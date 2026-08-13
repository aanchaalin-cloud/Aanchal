import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { homepageSectionCreateSchema } from "@/lib/validations";
import { getSectionDefinition } from "@/lib/homepage-sections";
import { Messages } from "@/lib/messages";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id, section_key, title, is_active, sort_order, content, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageLoadError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, homepageSectionCreateSchema);
  if (data instanceof NextResponse) return data;

  const definition = getSectionDefinition(data.section_key);
  if (!definition) {
    return NextResponse.json({ success: false, error: "Unknown section type." }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("homepage_sections")
    .select("id")
    .eq("section_key", data.section_key)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageSectionExists }, { status: 409 });
  }

  const { data: maxRow } = await supabase
    .from("homepage_sections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: created, error } = await supabase
    .from("homepage_sections")
    .insert({
      section_key: data.section_key,
      title: data.title,
      content: { ...definition.defaultContent, ...data.content },
      sort_order: (maxRow?.sort_order ?? 0) + 10,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageCreateError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

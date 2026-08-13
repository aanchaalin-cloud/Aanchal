import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { homepageSectionUpdateSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const data = await validateRequest(request, homepageSectionUpdateSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("homepage_sections")
    .select("id")
    .eq("id", id)
    .single();
  if (existingError || !existing) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageSectionNotFound }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.is_active !== undefined) patch.is_active = data.is_active;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  if (data.content !== undefined) patch.content = data.content;

  const { data: updated, error } = await supabase
    .from("homepage_sections")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageUpdateError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("homepage_sections")
    .select("id")
    .eq("id", id)
    .single();
  if (!existing) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageSectionNotFound }, { status: 404 });
  }

  const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageDeleteError }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

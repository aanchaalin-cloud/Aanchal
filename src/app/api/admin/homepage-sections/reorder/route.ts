import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { homepageSectionReorderSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, homepageSectionReorderSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: rows, error: listError } = await supabase
    .from("homepage_sections")
    .select("id, sort_order")
    .in("id", data.ids);
  if (listError) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageReorderError }, { status: 500 });
  }
  if (!rows || rows.length !== data.ids.length) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageSectionNotFound }, { status: 400 });
  }

  const updates = data.ids.map((id, index) =>
    supabase
      .from("homepage_sections")
      .update({ sort_order: (index + 1) * 10 })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) {
    return NextResponse.json({ success: false, error: Messages.adminHomepageReorderError }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

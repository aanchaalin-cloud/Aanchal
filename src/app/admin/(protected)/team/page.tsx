import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AdminTeamView from "@/components/admin/AdminTeamView";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?setup=required");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((admin?.role as string | undefined) !== "superadmin") {
    redirect("/admin");
  }

  return <AdminTeamView />;
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getCustomerProfile,
  getInfluencerStatus,
  getInfluencerEarningsDetail,
} from "@/lib/queries/customers";
import { InfluencerDashboard } from "@/components/influencer/InfluencerDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false },
};

export default async function InfluencerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Finfluencer%2Fdashboard");
  }

  if (!isSupabaseConfigured()) {
    redirect("/account?tab=influencer");
  }

  const [profile, influencerStatus, earnings] = await Promise.all([
    getCustomerProfile(user.id),
    getInfluencerStatus(user.id),
    getInfluencerEarningsDetail(user.id),
  ]);

  if (!influencerStatus || influencerStatus.status !== "approved") {
    redirect("/account?tab=influencer");
  }

  const referralCode = influencerStatus.referral_code ?? "";

  const summary = influencerStatus.earnings ?? { total: 0, pending: 0, paid: 0, orders: 0 };

  return (
    <Suspense>
      <InfluencerDashboard
        name={profile?.full_name ?? "Creator"}
        referralCode={referralCode}
        earnings={summary}
        history={earnings}
      />
    </Suspense>
  );
}

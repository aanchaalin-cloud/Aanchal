import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCustomerProfile,
  getOrdersByEmail,
  getWishlistProducts,
  getInfluencerStatus,
  getCustomerAddresses,
  getInfluencerEarningsDetail,
} from "@/lib/queries/customers";
import AccountView from "@/components/account/AccountView";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false },
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, orders, wishlist, influencerStatus, addresses, earnings] =
    await Promise.all([
      getCustomerProfile(user.id),
      getOrdersByEmail(user.email ?? ""),
      getWishlistProducts(user.id),
      getInfluencerStatus(user.id),
      getCustomerAddresses(user.id),
      getInfluencerEarningsDetail(user.id),
    ]);

  return (
    <Suspense>
      <AccountView
        profile={
          profile
            ? {
                full_name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                username: profile.username,
              }
            : null
        }
        orders={orders}
        wishlist={wishlist}
        influencerStatus={influencerStatus}
        addresses={addresses}
        influencerEarnings={earnings}
      />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { PackageSearch, IndianRupee, Truck, Timer, ShieldAlert, Building2 } from "lucide-react";
import {
  PolicyPage,
  PolicyCard,
  PolicyList,
} from "@/components/policies/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Learn about Aanchal's shipping process, delivery timelines, charges, and order tracking for orders across India.",
  alternates: {
    canonical: "/shipping-policy",
  },
  openGraph: {
    title: "Shipping Policy | Aanchal",
    description:
      "Learn about Aanchal's shipping process, delivery timelines, charges, and order tracking.",
  },
};

export default function ShippingPolicyPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Shipping Policy" lastUpdated="January 2025">
      <PolicyCard icon={<Timer className="h-4.5 w-4.5" />} title="Processing Time">
        <p>
          Orders are processed within 1–2 business days after payment confirmation.
          Since each Aanchal piece is custom tailored to your measurements, please
          allow up to 3 extra days for garments that require tailoring before dispatch.
          You will receive a shipment notification with tracking details once your
          order is on its way.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Truck className="h-4.5 w-4.5" />} title="Delivery Timeline">
        <p>
          Standard delivery across India typically takes 5–7 business days after
          dispatch. Delivery to remote or northeastern locations may take up to
          10 business days.
        </p>
      </PolicyCard>

      <PolicyCard icon={<IndianRupee className="h-4.5 w-4.5" />} title="Shipping Charges">
        <PolicyList
          items={[
            <span key="free">
              Shipping is <strong className="font-semibold text-[#1C1C1C]">free</strong> on all orders across India, with no minimum order value.
            </span>,
            <span key="custom">Custom-tailored pieces may be dispatched separately at no extra cost.</span>,
          ]}
        />
      </PolicyCard>

      <PolicyCard icon={<Building2 className="h-4.5 w-4.5" />} title="Shipping Partners">
        <p>
          We ship via reputable courier partners including Delhivery, BlueDart, and
          India Post. The courier partner is selected based on your pincode for the
          fastest delivery.
        </p>
      </PolicyCard>

      <PolicyCard icon={<PackageSearch className="h-4.5 w-4.5" />} title="Order Tracking">
        <p>
          Once shipped, you will receive a tracking number via email/SMS. You can use
          this to track your order on the courier partner&apos;s website, or visit our{" "}
          <a href="/track-order" className="font-medium text-[#800020] hover:underline">
            Track Order
          </a>{" "}
          page.
        </p>
      </PolicyCard>

      <PolicyCard icon={<ShieldAlert className="h-4.5 w-4.5" />} title="Damaged or Lost Shipments">
        <p>
          In the unlikely event of a lost or damaged shipment, please contact us within
          48 hours of the expected delivery date at{" "}
          <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
            hello@aanchal.in
          </a>{" "}
          with your order ID.
        </p>
      </PolicyCard>
    </PolicyPage>
  );
}

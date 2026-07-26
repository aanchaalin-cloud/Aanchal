import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Learn about Aanchal's shipping process, delivery timelines, charges, and order tracking for orders across India.",
  openGraph: {
    title: "Shipping Policy | Aanchal",
    description:
      "Learn about Aanchal's shipping process, delivery timelines, charges, and order tracking.",
  },
};

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
        Policies
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-[#1C1C1C] mb-8">
        Shipping Policy
      </h1>
      <div className="space-y-6 text-sm leading-relaxed text-[#6B6B6B]">
        <p>Last updated: January 2025</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Processing Time</h2>
        <p>Orders are processed within 1–2 business days after payment confirmation. You will receive a shipment notification with tracking details once your order is dispatched.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Delivery Timeline</h2>
        <p>Standard delivery across India typically takes 5–7 business days. Delivery to remote or northeastern locations may take up to 10 business days.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Shipping Charges</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Free shipping on orders above ₹999</li>
          <li>₹99 flat shipping fee on orders below ₹999</li>
        </ul>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Shipping Partners</h2>
        <p>We ship via reputable courier partners including Delhivery, BlueDart, and India Post. The courier partner is selected based on your pincode for the fastest delivery.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Order Tracking</h2>
        <p>Once shipped, you will receive a tracking number via email/SMS. You can use this to track your order on the courier partner&apos;s website.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Damaged or Lost Shipments</h2>
        <p>In the unlikely event of a lost or damaged shipment, please contact us within 48 hours of the expected delivery date at hello@aanchal.in with your order ID.</p>
      </div>
    </div>
  );
}

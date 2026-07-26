import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "Aanchal's 7-day return policy — how to return, refund timelines, and conditions for exchanges and defective items.",
  openGraph: {
    title: "Return & Refund Policy | Aanchal",
    description:
      "Aanchal's 7-day return policy — how to return, refund timelines, and conditions for exchanges and defective items.",
  },
};

export default function ReturnPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
        Policies
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-[#1C1C1C] mb-8">Return & Refund Policy</h1>
      <div className="space-y-6 text-sm leading-relaxed text-[#6B6B6B]">
        <p>Last updated: January 2025</p>
        <h2 className="text-xl font-semibold text-[#1C1C1C]">Returns</h2>
        <p>We accept returns within 7 days of delivery. Items must be unworn, unwashed, and in their original condition with all tags attached. Sale items are not eligible for return.</p>
        <h2 className="text-xl font-semibold text-[#1C1C1C]">How to Initiate a Return</h2>
        <p>Email us at hello@aanchal.in with your order ID, the item(s) you wish to return, and the reason for return. We will respond within 2 business days with return instructions.</p>
        <h2 className="text-xl font-semibold text-[#1C1C1C]">Refunds</h2>
        <p>Once we receive and inspect your returned item(s), we will process your refund within 5–7 business days. Refunds are issued to the original payment method. Shipping charges are non-refundable.</p>
        <h2 className="text-xl font-semibold text-[#1C1C1C]">Exchanges</h2>
        <p>We currently do not offer direct exchanges. Please return the item for a refund and place a new order for the desired item.</p>
        <h2 className="text-xl font-semibold text-[#1C1C1C]">Damaged or Defective Items</h2>
        <p>If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos. We will arrange a replacement or full refund at no additional cost.</p>
      </div>
    </div>
  );
}

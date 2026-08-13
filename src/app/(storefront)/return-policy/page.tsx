import type { Metadata } from "next";
import {
  RefreshCcw,
  XCircle,
  ShieldCheck,
  RotateCcw,
  IndianRupee,
} from "lucide-react";
import {
  PolicyPage,
  PolicyCard,
} from "@/components/policies/PolicyPage";

export const metadata: Metadata = {
  title: "Returns, Exchange & Cancellation Policy",
  description:
    "Aanchal's returns, exchange and cancellation policy — swap to a different product within 3 days of delivery (₹99 handling fee), and cancellation terms before and after dispatch.",
  alternates: {
    canonical: "/return-policy",
  },
  openGraph: {
    title: "Returns, Exchange & Cancellation Policy | Aanchal",
    description:
      "Easy exchanges within 3 days of delivery and simple cancellation terms before and after dispatch.",
  },
};

export default function ReturnPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Returns, Exchange & Cancellation"
      lastUpdated="January 2025"
    >
      <PolicyCard
        icon={<RefreshCcw className="h-4.5 w-4.5" />}
        title="Exchange — Swap to a Different Product"
      >
        <p>
          Changed your mind? You can{" "}
          <strong className="font-semibold text-[#1C1C1C]">
            exchange within 3 days of delivery
          </strong>{" "}
          and swap to a different product. A one-time handling fee of{" "}
          <strong className="font-semibold text-[#1C1C1C]">₹99</strong> applies.
        </p>
        <ul className="space-y-1.5">
          {[
            "The item must be unworn, unwashed, and in its original condition with all tags attached.",
            "The exchange product must be of equal or higher value. The price difference (if any) will be billed to you.",
            "Custom-fit garments are tailored to your measurements, so exchanges are only possible where we can re-tailor the piece.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A843]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          Contact us at{" "}
          <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
            hello@aanchal.in
          </a>{" "}
          within 3 days of delivery with your order ID and the product you&apos;d like
          instead.
        </p>
      </PolicyCard>

      <PolicyCard icon={<XCircle className="h-4.5 w-4.5" />} title="Cancellation">
        <p>Need to cancel? Here&apos;s how it works:</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-2.5">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF0E8]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#800020]" />
            </span>
            <span>
              <strong className="font-semibold text-[#1C1C1C]">
                Free cancellation before dispatch.
              </strong>{" "}
              Cancel any time before your order is shipped — no charges, full refund
              (if paid) within 5–7 business days.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF0E8]">
              <IndianRupee className="h-3.5 w-3.5 text-[#800020]" />
            </span>
            <span>
              <strong className="font-semibold text-[#1C1C1C]">
                15% deduction after dispatch.
              </strong>{" "}
              If your order has already been dispatched, a 15% deduction applies and
              the balance is refunded within 5–7 business days.
            </span>
          </li>
        </ul>
        <p>
          To cancel, email us at{" "}
          <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
            hello@aanchal.in
          </a>{" "}
          with your order ID, or use the &quot;Cancel Order&quot; option from your
          account.
        </p>
      </PolicyCard>

      <PolicyCard icon={<RotateCcw className="h-4.5 w-4.5" />} title="Damaged or Defective Items">
        <p>
          If you receive a damaged or defective item, contact us within 48 hours of
          delivery with photos. We will arrange a replacement or full refund at no
          additional cost — no handling fee applies.
        </p>
      </PolicyCard>

      <PolicyCard icon={<ShieldCheck className="h-4.5 w-4.5" />} title="Refunds">
        <p>
          Once approved, refunds are processed to the original payment method within
          5–7 business days. For COD orders, refunds are transferred to your bank
          account using the details you provide. Shipping charges are non-refundable
          except in the case of damaged or defective items.
        </p>
      </PolicyCard>

      <p className="text-xs leading-relaxed text-[#6B6B6B]/70">
        Aanchal garments are custom-fit to your measurements. Please measure carefully
        and refer to our measurement guide. For any questions, reach out to{" "}
        <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
          hello@aanchal.in
        </a>
        .
      </p>
    </PolicyPage>
  );
}

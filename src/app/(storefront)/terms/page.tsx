import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Aanchal's terms and conditions — order policies, pricing, intellectual property, and liability information.",
  openGraph: {
    title: "Terms & Conditions | Aanchal",
    description:
      "Aanchal's terms and conditions — order policies, pricing, intellectual property, and liability information.",
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
        Policies
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-[#1C1C1C] mb-8">Terms & Conditions</h1>
      <div className="space-y-6 text-sm leading-relaxed text-[#6B6B6B]">
        <p>Last updated: January 2025</p>
        <p>By accessing or using the Aanchal website, you agree to be bound by these terms and conditions.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">General</h2>
        <p>All products displayed on this website are subject to availability. We reserve the right to discontinue any product at any time. Prices are subject to change without prior notice.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Orders</h2>
        <p>By placing an order, you confirm that all information provided is accurate. We reserve the right to cancel orders in case of suspected fraud or unauthorized transactions.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Pricing</h2>
        <p>All prices are in Indian Rupees (₹). The final price is calculated at checkout and includes applicable taxes. We do not trust or accept client-side price modifications.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Intellectual Property</h2>
        <p>All content on this website — including text, images, logos, and designs — is the property of Aanchal and may not be reproduced without permission.</p>

        <h2 className="text-xl font-semibold text-[#1C1C1C]">Limitation of Liability</h2>
        <p>Aanchal shall not be liable for any indirect, incidental, or consequential damages arising from the use of this website or its products.</p>
      </div>
    </div>
  );
}

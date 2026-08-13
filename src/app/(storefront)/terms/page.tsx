import type { Metadata } from "next";
import { ScrollText, ShoppingCart, IndianRupee, Copyright, Scale } from "lucide-react";
import {
  PolicyPage,
  PolicyCard,
} from "@/components/policies/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Aanchal's terms and conditions — order policies, pricing, intellectual property, and liability information.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms & Conditions | Aanchal",
    description:
      "Aanchal's terms and conditions — order policies, pricing, intellectual property, and liability information.",
  },
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Terms & Conditions" lastUpdated="January 2025">
      <p className="text-sm leading-relaxed text-[#6B6B6B]">
        By accessing or using the Aanchal website, you agree to be bound by these
        terms and conditions.
      </p>

      <PolicyCard icon={<ScrollText className="h-4.5 w-4.5" />} title="General">
        <p>
          All products displayed on this website are subject to availability. We
          reserve the right to discontinue any product at any time. Prices are subject
          to change without prior notice.
        </p>
      </PolicyCard>

      <PolicyCard icon={<ShoppingCart className="h-4.5 w-4.5" />} title="Orders">
        <p>
          By placing an order, you confirm that all information provided is accurate.
          We reserve the right to cancel orders in case of suspected fraud or
          unauthorized transactions.
        </p>
      </PolicyCard>

      <PolicyCard icon={<IndianRupee className="h-4.5 w-4.5" />} title="Pricing">
        <p>
          All prices are in Indian Rupees (₹). The final price is calculated at
          checkout and includes applicable taxes. We do not trust or accept client-side
          price modifications.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Copyright className="h-4.5 w-4.5" />} title="Intellectual Property">
        <p>
          All content on this website — including text, images, logos, and designs — is
          the property of Aanchal and may not be reproduced without permission.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Scale className="h-4.5 w-4.5" />} title="Limitation of Liability">
        <p>
          Aanchal shall not be liable for any indirect, incidental, or consequential
          damages arising from the use of this website or its products.
        </p>
      </PolicyCard>

      <p className="text-xs leading-relaxed text-[#6B6B6B]/70">
        For questions about these terms, reach out to{" "}
        <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
          hello@aanchal.in
        </a>
        .
      </p>
    </PolicyPage>
  );
}

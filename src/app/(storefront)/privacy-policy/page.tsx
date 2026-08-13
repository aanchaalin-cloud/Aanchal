import type { Metadata } from "next";
import { UserRound, Database, ShieldCheck, Building2, Mail } from "lucide-react";
import {
  PolicyPage,
  PolicyCard,
  PolicyList,
} from "@/components/policies/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Aanchal's privacy policy — how we collect, use, and protect your personal information when you shop with us.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | Aanchal",
    description:
      "Aanchal's privacy policy — how we collect, use, and protect your personal information.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage eyebrow="Policies" title="Privacy Policy" lastUpdated="January 2025">
      <p className="text-sm leading-relaxed text-[#6B6B6B]">
        This Privacy Policy describes how Aanchal collects, uses, and protects your
        personal information when you visit or make a purchase from our website.
      </p>

      <PolicyCard icon={<UserRound className="h-4.5 w-4.5" />} title="Information We Collect">
        <p>
          We collect information you provide directly to us, such as your name, email
          address, phone number, shipping address, and payment details when you place
          an order. For custom-fit garments, we also collect the measurements you share
          so every piece is tailored for you. Payment details are processed securely
          through Razorpay and are never stored on our servers.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Database className="h-4.5 w-4.5" />} title="How We Use Your Information">
        <PolicyList
          items={[
            <span key="order">To process and fulfil your orders, including custom tailoring</span>,
            <span key="comm">To communicate with you about your order</span>,
            <span key="improve">To improve our products and services</span>,
            <span key="promo">To send occasional promotional emails (only with your consent)</span>,
          ]}
        />
      </PolicyCard>

      <PolicyCard icon={<ShieldCheck className="h-4.5 w-4.5" />} title="Data Protection">
        <p>
          We implement a variety of security measures to maintain the safety of your
          personal information. Your data is stored in secure databases and accessed
          only by authorized personnel.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Building2 className="h-4.5 w-4.5" />} title="Third-Party Services">
        <p>
          We use Razorpay for payment processing and Supabase for database hosting.
          These third parties have their own privacy policies governing the use of your
          data.
        </p>
      </PolicyCard>

      <PolicyCard icon={<Mail className="h-4.5 w-4.5" />} title="Contact">
        <p>
          For questions about this privacy policy, please contact us at{" "}
          <a href="mailto:hello@aanchal.in" className="font-medium text-[#800020] hover:underline">
            hello@aanchal.in
          </a>
          .
        </p>
      </PolicyCard>
    </PolicyPage>
  );
}

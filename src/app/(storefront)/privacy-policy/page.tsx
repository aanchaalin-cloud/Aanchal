import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Aanchal's privacy policy — how we collect, use, and protect your personal information when you shop with us.",
  openGraph: {
    title: "Privacy Policy | Aanchal",
    description:
      "Aanchal's privacy policy — how we collect, use, and protect your personal information.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
        Policies
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1C1C1C] mb-8">Privacy Policy</h1>
      <div className="space-y-6 text-sm leading-relaxed text-[#6B6B6B]">
        <p>Last updated: January 2025</p>
        <p>This Privacy Policy describes how Aanchal collects, uses, and protects your personal information when you visit or make a purchase from our website.</p>

        <h2 className="font-serif text-xl font-semibold text-[#1C1C1C]">Information We Collect</h2>
        <p>We collect information you provide directly to us, such as your name, email address, phone number, shipping address, and payment details when you place an order. Payment details are processed securely through Razorpay and are never stored on our servers.</p>

        <h2 className="font-serif text-xl font-semibold text-[#1C1C1C]">How We Use Your Information</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>To process and fulfil your orders</li>
          <li>To communicate with you about your order</li>
          <li>To improve our products and services</li>
          <li>To send occasional promotional emails (only with your consent)</li>
        </ul>

        <h2 className="font-serif text-xl font-semibold text-[#1C1C1C]">Data Protection</h2>
        <p>We implement a variety of security measures to maintain the safety of your personal information. Your data is stored in secure databases and accessed only by authorized personnel.</p>

        <h2 className="font-serif text-xl font-semibold text-[#1C1C1C]">Third-Party Services</h2>
        <p>We use Razorpay for payment processing and Supabase for database hosting. These third parties have their own privacy policies governing the use of your data.</p>

        <h2 className="font-serif text-xl font-semibold text-[#1C1C1C]">Contact</h2>
        <p>For questions about this privacy policy, please contact us at hello@aanchal.in.</p>
      </div>
    </div>
  );
}

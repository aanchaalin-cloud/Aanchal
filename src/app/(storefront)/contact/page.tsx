import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us & Contact",
  description:
    "Learn about Aanchal — our story, values, and how to get in touch. Email, phone, and address for customer support and inquiries.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "About Us & Contact | Aanchal",
    description:
      "Learn about Aanchal — our story, values, and how to get in touch.",
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
          About
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[#1C1C1C]">
          About Aanchal
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#6B6B6B] max-w-2xl">
          <p>
            Aanchal is a celebration of Indian craftsmanship — thoughtfully designed clothing 
            that honours the country&rsquo;s rich textile heritage while embracing modern silhouettes. 
            Every piece is created with care, from the fabrics we choose to the details that define them.
          </p>
          <p>
            Our name evokes the warmth of a draped dupatta — the comfort of tradition and the 
            quiet confidence of a woman who knows her style. We work closely with skilled artisans 
            to bring you clothing that feels as beautiful as it looks.
          </p>
          <p>
            Whether you&rsquo;re dressing for a celebration or adding a touch of grace to your 
            everyday wardrobe, Aanchal is here to wrap you in elegance.
          </p>
        </div>
      </div>

      <div className="border-t border-[#E5D5C5]/50 pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
          Get in Touch
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
          Contact Us
        </h2>
        <p className="mt-3 text-sm text-[#6B6B6B] max-w-lg">
          Have a question about an order or our products? We&rsquo;d love to hear from you.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex items-start gap-4 bg-white rounded-sm border border-[#E5D5C5]/50 p-5">
            <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#800020]" />
            <div>
              <p className="text-sm font-medium text-[#1C1C1C]">Email</p>
              <a
                href="mailto:hello@aanchal.in"
                className="text-sm text-[#6B6B6B] hover:text-[#800020] transition-colors"
              >
                hello@aanchal.in
              </a>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                We respond within 24 hours on business days.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white rounded-sm border border-[#E5D5C5]/50 p-5">
            <Phone className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#800020]" />
            <div>
              <p className="text-sm font-medium text-[#1C1C1C]">Phone / WhatsApp</p>
              <a
                href="tel:+917742719732"
                className="text-sm text-[#6B6B6B] hover:text-[#800020] transition-colors"
              >
                +91 77427 19732
              </a>
              <p className="mt-1 text-xs text-[#6B6B6B]">
                Mon–Sat, 10 AM – 6 PM IST
              </p>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-start gap-4 bg-white rounded-sm border border-[#E5D5C5]/50 p-5">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#800020]" />
            <div>
              <p className="text-sm font-medium text-[#1C1C1C]">Visit Us</p>
              <p className="text-sm text-[#6B6B6B]">
                Aanchal Textiles
                <br />
                Mumbai, Maharashtra, India
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Track Order", href: "/track-order" },
  { label: "Influencer Program", href: "/influencer" },
  { label: "My Account", href: "/account" },
  { label: "Contact", href: "/contact" },
];

const POLICY_LINKS = [
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Return Policy", href: "/return-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="font-serif text-xl font-semibold tracking-wide text-white">
              Aanchal
            </Link>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">
              Celebrating the art of Indian craftsmanship through thoughtfully designed clothing for the modern wardrobe.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-4">
              Links
            </h4>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-4">
              Policies
            </h4>
            <ul className="space-y-2">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-4">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a href="mailto:aanchaal.in@gmail.com" className="hover:text-white transition-colors">
                  aanchaal.in@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+917742719732" className="hover:text-white transition-colors">
                  +91 77427 19732
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/__aanchal__in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Aanchal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

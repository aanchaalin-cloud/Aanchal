import type { Metadata } from "next";
import { Hind, Eczar } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const eczar = Eczar({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aanchal.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aanchal | Premium Indian Clothing Brand",
    template: "%s | Aanchal",
  },
  description:
    "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
  keywords: [
    "Indian clothing",
    "ethnic wear",
    "boutique clothing",
    "premium Indian fashion",
    "sarees",
    "kurtas",
    "Indian fashion brand",
    "Aanchal",
  ],
  openGraph: {
    title: "Aanchal | Premium Indian Clothing Brand",
    description:
      "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
    type: "website",
    locale: "en_IN",
    siteName: "Aanchal",
    images: [
      {
        url: "/og/aanchal-og.jpg",
        width: 1200,
        height: 630,
        alt: "Aanchal – Premium Indian Clothing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aanchal | Premium Indian Clothing Brand",
    description:
      "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm.",
    images: ["/og/aanchal-og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  other: {
    "theme-color": "#FFF8F3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hind.variable} ${eczar.variable}`}>
      <body className="antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

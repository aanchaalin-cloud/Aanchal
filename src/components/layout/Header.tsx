"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const { itemCount, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "top-0 bg-[#95271D]/95 backdrop-blur-md shadow-sm"
          : "top-4"
      )}
    >
      <div
        className={cn(
          "mx-auto transition-all duration-300",
          scrolled
            ? "max-w-7xl px-4 sm:px-6 lg:px-8"
            : "max-w-4xl px-4"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-300",
            scrolled
              ? "h-14 md:h-16"
              : "h-12 rounded-full border border-[#D4A843]/30 bg-[#95271D]/80 backdrop-blur-md px-4 md:px-6 shadow-sm"
          )}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt="Aanchal"
              width={100}
              height={32}
              className="h-6 md:h-8 w-auto object-contain brightness-100"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#D4A843]/80 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCart}
              className="relative p-2 text-[#D4A843]/80 hover:text-white transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 md:h-4 md:w-4 items-center justify-center rounded-full bg-[#800020] text-[9px] md:text-[10px] font-semibold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#D4A843]/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 px-4",
          mobileOpen ? "max-h-64" : "max-h-0"
        )}
      >
        <nav
          className={cn(
            "rounded-xl border border-[#D4A843]/30 bg-[#95271D]/95 backdrop-blur-md px-4 py-3 space-y-2 shadow-sm",
            scrolled ? "mt-0" : "mt-2"
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-[#D4A843]/80 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

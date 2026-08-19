"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Menu,
  X,
  Heart,
  User,
  PackageSearch,
  Megaphone,
  Home,
  Gift,
  ShoppingCart,
  Mail,
  ChevronDown,
  LogOut,
  MapPin,
  Shield,
  Package,
  Truck,
  Newspaper,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop", href: "/shop", icon: ShoppingBag },
  { label: "Influencer Program", href: "/influencer", icon: Megaphone },
  { label: "Rewards", href: "/rewards", icon: Gift },
];

const DRAWER_GROUPS = [
  {
    title: "Shop",
    links: [
      { label: "Shop All", href: "/shop", icon: ShoppingBag },
      { label: "Wishlist", href: "/account?tab=wishlist", icon: Heart },
      { label: "Cart", href: "/cart", icon: ShoppingCart },
    ],
  },
  {
    title: "Aanchal",
    links: [
      { label: "Influencer Program", href: "/influencer", icon: Megaphone },
      { label: "Rewards", href: "/rewards", icon: Gift },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Track Order", href: "/track-order", icon: PackageSearch },
      { label: "Contact", href: "/contact", icon: Mail },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Shipping Policy", href: "/shipping-policy", icon: Truck },
      { label: "Return Policy", href: "/return-policy", icon: Package },
      { label: "Privacy Policy", href: "/privacy-policy", icon: Shield },
      { label: "Terms & Conditions", href: "/terms", icon: Newspaper },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/products");
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function AccountMenuItem({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
    >
      <span className="text-[#95271D]">{icon}</span>
      {label}
    </Link>
  );
}

export function Header() {
  const { itemCount, openCart } = useCart();
  const { user, loading: authLoading, adminRole, signOut } = useAuth();
  const { count: wishlistCount, loading: wishlistLoading } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !drawer.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
  }, [drawerOpen]);

  const openDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  const pathname = usePathname();
  const accountHref = user ? "/account" : "/login?next=%2Faccount";
  const wishlistHref = user
    ? "/account?tab=wishlist"
    : "/login?next=%2Faccount%3Ftab%3Dwishlist";
  const accountLabel = authLoading ? "…" : user ? "Profile" : "Login";

  const isHome = pathname === "/";
  const pill = isHome && !scrolled;

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium tracking-wide transition-colors",
      isActive(pathname, href)
        ? "bg-[#FFF0E8] text-[#800020] font-semibold"
        : "text-[#1C1C1C] hover:text-[#95271D]"
    );

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-300",
          pill
            ? "top-12"
            : cn(
                "border-b border-[#E5D5C5] bg-white shadow-sm",
                isHome ? "top-8" : "top-0"
              )
        )}
      >
        <div
          className={cn(
            "mx-auto transition-all duration-300",
            pill ? "max-w-4xl px-4" : "max-w-7xl px-4 sm:px-6 lg:px-8"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3 transition-all duration-300",
              pill
                ? "h-12 rounded-full border border-[#E5D5C5] bg-white px-3 sm:px-4 shadow-sm"
                : "h-16"
            )}
          >
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                type="button"
                ref={menuButtonRef}
                onClick={openDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                aria-controls="drawer-menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link href="/" className="flex items-center shrink-0" aria-label="Aanchal home">
                <Image
                  src="/logo.png"
                  alt="Aanchal"
                  width={100}
                  height={32}
                  className="h-7 md:h-8 w-auto object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Center nav — Home, Shop, Influencer Program, Rewards (icon + text) */}
            <nav className={cn(pill ? "hidden" : "hidden lg:flex items-center gap-2")}>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: wishlist, cart, login/profile */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href={wishlistHref}
                className="relative p-2 text-[#1C1C1C] hover:text-[#95271D] transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
                {user && !wishlistLoading && wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={openCart}
                className="relative p-2 text-[#1C1C1C] hover:text-[#95271D] transition-colors"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {authLoading ? (
                <Link
                  href={accountHref}
                  className="flex items-center gap-1.5 rounded-full bg-[#800020] px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#95271D] sm:px-4"
                  aria-label="Account"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden text-sm font-medium xl:inline">…</span>
                </Link>
              ) : user ? (
                <div ref={accountRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-full bg-[#800020] py-1.5 pl-1.5 pr-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#95271D] sm:pr-3"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    aria-label="Account menu"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold uppercase">
                      {(user.email ?? "U").charAt(0)}
                    </span>
                    <span className="hidden max-w-[110px] truncate text-sm font-medium md:inline">
                      {(user.user_metadata?.full_name as string)?.split(" ")[0] || "Account"}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 md:inline" />
                  </button>

                  {accountOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#E5D5C5] bg-white shadow-xl"
                    >
                      <div className="border-b border-[#E5D5C5]/60 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-[#1C1C1C]">
                          {user.user_metadata?.full_name as string}
                        </p>
                        <p className="truncate text-xs text-stone-500">{user.email}</p>
                      </div>

                      <nav className="py-1">
                        <AccountMenuItem href="/account" icon={<User className="h-4 w-4" />} label="My Profile" onNavigate={() => setAccountOpen(false)} />
                        <AccountMenuItem href="/account?tab=orders" icon={<Package className="h-4 w-4" />} label="My Orders" onNavigate={() => setAccountOpen(false)} />
                        <AccountMenuItem href="/account?tab=wishlist" icon={<Heart className="h-4 w-4" />} label="Wishlist" onNavigate={() => setAccountOpen(false)} />
                        <AccountMenuItem href="/account?tab=addresses" icon={<MapPin className="h-4 w-4" />} label="Addresses" onNavigate={() => setAccountOpen(false)} />
                        <AccountMenuItem href="/influencer/dashboard" icon={<Megaphone className="h-4 w-4" />} label="Influencer Panel" onNavigate={() => setAccountOpen(false)} />
                        {adminRole && (
                          <AccountMenuItem href="/admin" icon={<Shield className="h-4 w-4" />} label="Admin Panel" onNavigate={() => setAccountOpen(false)} />
                        )}
                      </nav>

                      <div className="border-t border-[#E5D5C5]/60 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAccountOpen(false);
                            signOut();
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-stone-600 hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={accountHref}
                  className="flex items-center gap-1.5 rounded-full bg-[#800020] px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#95271D] sm:px-4"
                  aria-label={user ? "My account" : "Sign in"}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden text-sm font-medium xl:inline">{accountLabel}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile scrolled strip — icon + text quick nav */}
        {!pill && (
          <nav
            className="lg:hidden border-t border-[#E5D5C5]/60 bg-white"
            aria-label="Quick links"
          >
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hidden px-3 py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive(pathname, link.href)
                      ? "bg-[#800020] text-white"
                      : "text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D]"
                  )}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={openCart}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-[#1C1C1C] transition-colors hover:bg-[#FFF0E8] hover:text-[#95271D]"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Cart
                {itemCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#95271D] px-1 text-[9px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>
              <Link
                href={accountHref}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive(pathname, "/account")
                    ? "bg-[#800020] text-white"
                    : "text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D]"
                )}
              >
                <User className="h-3.5 w-3.5" />
                {authLoading ? "…" : user ? "Profile" : "Login"}
              </Link>
              {adminRole && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    isActive(pathname, "/admin")
                      ? "bg-[#800020] text-white"
                      : "text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D]"
                  )}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Slidebar drawer — categorized secondary nav */}
      <aside
        id="drawer-menu"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!drawerOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex w-80 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-300",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E5D5C5] px-5 py-4">
          <Link href="/" onClick={closeDrawer} aria-label="Aanchal home">
            <Image
              src="/logo.png"
              alt="Aanchal"
              width={90}
              height={28}
              className="h-6 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {DRAWER_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#800020]">
                {group.title}
              </p>
              <nav className="space-y-0.5">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeDrawer}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                  >
                    <link.icon className="h-4.5 w-4.5 text-[#95271D]" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <div className="my-2 border-t border-[#E5D5C5]/60" />

          <div className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#800020]">
              Account
            </p>
            <nav className="space-y-0.5">
              <Link
                href={accountHref}
                onClick={closeDrawer}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
              >
                <User className="h-4.5 w-4.5 text-[#95271D]" />
                {authLoading ? "…" : user ? "Profile" : "Login / Sign Up"}
              </Link>

              <Link
                href={wishlistHref}
                onClick={closeDrawer}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
              >
                <Heart className="h-4.5 w-4.5 text-[#95271D]" />
                Wishlist
                {user && !wishlistLoading && wishlistCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#95271D] px-1.5 text-[10px] font-semibold text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {user && (
                <>
                  <Link
                    href="/account?tab=orders"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                  >
                    <Package className="h-4.5 w-4.5 text-[#95271D]" />
                    My Orders
                  </Link>
                  <Link
                    href="/account?tab=addresses"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                  >
                    <MapPin className="h-4.5 w-4.5 text-[#95271D]" />
                    Addresses
                  </Link>
                  <Link
                    href="/influencer/dashboard"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                  >
                    <Megaphone className="h-4.5 w-4.5 text-[#95271D]" />
                    Influencer Panel
                  </Link>
                  {adminRole && (
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                    >
                      <Shield className="h-4.5 w-4.5 text-[#95271D]" />
                      Admin Panel
                    </Link>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  openCart();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
              >
                <ShoppingCart className="h-4.5 w-4.5 text-[#95271D]" />
                Cart
                {itemCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#95271D] px-1.5 text-[10px] font-semibold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    signOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-500 hover:bg-[#FFF0E8] hover:text-[#95271D] transition-colors"
                >
                  <LogOut className="h-4.5 w-4.5 text-[#95271D]" />
                  Sign Out
                </button>
              )}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}

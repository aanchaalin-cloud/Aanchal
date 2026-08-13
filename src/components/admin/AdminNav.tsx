"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, LogOut, Star, Gift, Box, Tag, Megaphone, Users, ShieldCheck, LayoutGrid, LayoutTemplate } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate, exact: true },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { href: "/admin/packaging", label: "Packaging", icon: Box, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: Star, exact: true },
  { href: "/admin/rewards", label: "Rewards", icon: Gift, exact: true },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, exact: true },
  { href: "/admin/influencers", label: "Influencers", icon: Megaphone, exact: true },
  { href: "/admin/team", label: "Team", icon: ShieldCheck, exact: true, superadmin: true },
];

export function AdminNav({ userEmail, role }: { userEmail: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => !("superadmin" in item) || role === "superadmin");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="font-serif text-lg font-semibold text-stone-900">
            Aanchal Admin
          </Link>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {visibleItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${
                role === "superadmin" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
              }`}
            >
              {role === "superadmin" ? "Super Admin" : "Admin"}
            </span>
            <span className="hidden sm:block text-xs text-stone-600 truncate max-w-[160px]">
              {userEmail}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-stone-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="flex sm:hidden gap-1 pb-2 overflow-x-auto">
          {visibleItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
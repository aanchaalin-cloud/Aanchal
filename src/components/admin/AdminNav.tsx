"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, LogOut, Star, Gift, Box, Tag,
  Megaphone, Users, ShieldCheck, LayoutGrid, LayoutTemplate, Menu, X, ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate, exact: true },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid, exact: false },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { href: "/admin/packaging", label: "Packaging", icon: Box, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: Star, exact: true },
  { href: "/admin/rewards", label: "Rewards", icon: Gift, exact: true },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, exact: true },
  { href: "/admin/influencers", label: "Influencers", icon: Megaphone, exact: true },
  { href: "/admin/team", label: "Team", icon: ShieldCheck, exact: true, superadmin: true },
];

function SidebarContent({
  visibleItems,
  pathname,
  onNavClick,
}: {
  visibleItems: typeof NAV_ITEMS;
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 border-b border-stone-800">
        <Link href="/admin" className="font-serif text-lg font-semibold text-white block" onClick={onNavClick}>
          Aanchal
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {visibleItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== "/admin";
          const isDashboard = item.href === "/admin" && pathname === "/admin";
          const isActive = active || isDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-400 hover:bg-stone-800 hover:text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-stone-500 group-hover:text-stone-300")} />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3 w-3 text-stone-600" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminNav({ userEmail, role }: { userEmail: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !("superadmin" in item) || role === "superadmin");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-stone-950 text-stone-300 z-30">
        <SidebarContent visibleItems={visibleItems} pathname={pathname} />
        <div className="border-t border-stone-800 p-3 mt-auto">
          <div className="px-3 py-2 mb-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              role === "superadmin" ? "bg-amber-900/50 text-amber-300" : "bg-stone-800 text-stone-400"
            }`}>
              {role === "superadmin" ? "Super Admin" : "Admin"}
            </span>
            <p className="text-xs text-stone-500 truncate mt-1 max-w-[200px]">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-stone-950 border-b border-stone-800">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin" className="font-serif text-base font-semibold text-white">
              Aanchal
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              role === "superadmin" ? "bg-amber-900/50 text-amber-300" : "bg-stone-800 text-stone-400"
            }`}>
              {role === "superadmin" ? "Super Admin" : "Admin"}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-stone-400 hover:bg-stone-800 hover:text-red-400 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Active section label */}
        <div className="px-4 pb-2">
          <p className="text-xs text-stone-500">
            {visibleItems.find((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && pathname !== "/admin";
              const isDashboard = item.href === "/admin" && pathname === "/admin";
              return active || isDashboard;
            })?.label ?? "Admin"}
          </p>
        </div>
      </div>

      {/* ── Mobile Slide-Over ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="absolute inset-y-0 left-0 w-72 bg-stone-950 flex flex-col shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-3 text-stone-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              visibleItems={visibleItems}
              pathname={pathname}
              onNavClick={() => setMobileOpen(false)}
            />
            <div className="border-t border-stone-800 p-3 mt-auto">
              <div className="px-3 py-2 mb-1">
                <p className="text-xs text-stone-500 truncate max-w-[200px]">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

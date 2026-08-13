"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Heart,
  Megaphone,
  LogOut,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Gift,
  ArrowRight,
  UserRound,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Save,
  Loader2,
  BadgeCheck,
  Copy,
} from "lucide-react";
import type { OrderWithItems, ProductWithDetails } from "@/types";
import type { CustomerAddress, InfluencerEarningRow } from "@/lib/queries/customers";
import { formatPrice, getOrderStatusLabel, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  full_name: string;
  email: string;
  phone: string | null;
};

type Props = {
  profile: ProfileData | null;
  orders: OrderWithItems[];
  wishlist: ProductWithDetails[];
  influencerStatus: {
    status: string;
    referral_code: string | null;
    earnings?: { total: number; pending: number; paid: number; orders: number };
  } | null;
  addresses: CustomerAddress[];
  influencerEarnings: InfluencerEarningRow[];
};

type Tab = "orders" | "wishlist" | "addresses" | "influencer" | "profile";

const EMPTY_ADDRESS: Omit<CustomerAddress, "id" | "created_at"> = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  is_default: false,
};

export default function AccountView({
  profile,
  orders,
  wishlist,
  influencerStatus,
  addresses,
  influencerEarnings,
}: Props) {
  const { signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    requestedTab === "wishlist" ||
      requestedTab === "addresses" ||
      requestedTab === "influencer" ||
      requestedTab === "profile"
      ? requestedTab
      : "orders"
  );

  // Profile edit
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Addresses
  const [addressDraft, setAddressDraft] = useState<Omit<CustomerAddress, "id" | "created_at"> | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const selectTab = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

  const pendingCount = orders.filter((o) =>
    ["pending", "confirmed", "in_production", "ready_to_ship", "shipped", "out_for_delivery"].includes(o.order_status)
  ).length;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMsg({ ok: true, text: "Profile updated." });
        router.refresh();
      } else {
        setProfileMsg({ ok: false, text: data.error ?? "Unable to update profile." });
      }
    } catch {
      setProfileMsg({ ok: false, text: "Unable to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg({ ok: false, text: error.message });
      } else {
        setPasswordMsg({ ok: true, text: "Password updated successfully." });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMsg({ ok: false, text: "Unable to update password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const startAddAddress = () => {
    setAddressDraft({ ...EMPTY_ADDRESS, is_default: addresses.length === 0 });
    setEditingAddressId(null);
  };

  const startEditAddress = (addr: CustomerAddress) => {
    const { id, ...rest } = addr;
    setAddressDraft(rest);
    setEditingAddressId(id);
  };

  const cancelAddress = () => {
    setAddressDraft(null);
    setEditingAddressId(null);
  };

  const submitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressDraft) return;
    setSavingAddress(true);
    try {
      const res = await fetch(
        editingAddressId ? `/api/account/addresses/${editingAddressId}` : "/api/account/addresses",
        {
          method: editingAddressId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addressDraft),
        }
      );
      const data = await res.json();
      if (data.success) {
        cancelAddress();
        router.refresh();
      } else {
        alert(data.error ?? "Unable to save address.");
      }
    } catch {
      alert("Unable to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) router.refresh();
      else alert(data.error ?? "Unable to delete address.");
    } catch {
      alert("Unable to delete address.");
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "orders", label: "Orders", icon: Package },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "influencer", label: "Influencer", icon: Megaphone },
    { id: "profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            My Account
          </p>
          <h1 className="font-display text-3xl text-[#1C1C1C]">
            Hello, {profile?.full_name ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">{profile?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 rounded border border-[#E5D5C5] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-[#FFF0E8] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:border-r lg:border-[#E5D5C5]/70 lg:pr-4">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-[#95271D] text-white"
                    : "text-[#6B6B6B] hover:bg-[#FFF0E8] hover:text-[#1C1C1C]"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.id === "orders" && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#95271D] px-1.5 text-[10px] font-semibold text-white lg:bg-[#FFF0E8] lg:text-[#95271D]">
                    {pendingCount}
                  </span>
                )}
                {t.id === "wishlist" && wishlist.length > 0 && (
                  <span className="ml-auto rounded-full bg-[#95271D] px-1.5 text-[10px] font-semibold text-white lg:bg-[#FFF0E8] lg:text-[#95271D]">
                    {wishlist.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          {/* ORDERS */}
          {tab === "orders" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#1C1C1C]">Your Orders</h2>
              {orders.length === 0 ? (
                <StorefrontEmptyState
                  icon={ShoppingBag}
                  title="No orders yet"
                  message="When you place an order it will appear here so you can track it anytime."
                  actionLabel="Start Shopping"
                  actionHref="/shop"
                />
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/track-order?order=${order.id}&email=${encodeURIComponent(profile?.email ?? "")}`}
                      className="block rounded-sm border border-[#E5D5C5]/60 bg-white p-4 hover:border-[#95271D]/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-xs text-[#6B6B6B]">
                              {order.id.slice(0, 8).toUpperCase()}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                order.order_status === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : ["cancelled", "returned", "refunded"].includes(order.order_status)
                                  ? "bg-[#C41E3A]/10 text-[#C41E3A]"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {order.order_status === "delivered" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : ["cancelled", "returned", "refunded"].includes(order.order_status) ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {getOrderStatusLabel(order.order_status)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#6B6B6B]">
                            {formatDate(order.created_at)} • {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#1C1C1C]">
                              {formatPrice(order.total_amount)}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-[#6B6B6B]">
                              {order.payment_status}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#95271D]" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WISHLIST */}
          {tab === "wishlist" && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[#1C1C1C]">Your Wishlist</h2>
              {wishlist.length === 0 ? (
                <StorefrontEmptyState
                  icon={Heart}
                  title="Your wishlist is empty"
                  message="Tap the heart on any product to save it here for later."
                  actionLabel="Browse Products"
                  actionHref="/shop"
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {wishlist.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group overflow-hidden rounded-sm border border-[#E5D5C5]/60 bg-white"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#FFF0E8]">
                        <Image
                          src={product.product_images?.[0]?.url ?? "/images/product-placeholder.svg"}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-[#1C1C1C]">{product.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#C41E3A]">
                            {formatPrice(product.discount_price ?? product.price)}
                          </span>
                          <span className="text-xs text-[#6B6B6B] line-through">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES */}
          {tab === "addresses" && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1C1C1C]">Your Addresses</h2>
                {!addressDraft && (
                  <button
                    onClick={startAddAddress}
                    className="inline-flex items-center gap-1.5 rounded bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Address
                  </button>
                )}
              </div>

              {addressDraft && (
                <form
                  onSubmit={submitAddress}
                  className="mb-6 rounded-sm border border-[#E5D5C5] bg-[#FFF8F3] p-5 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-[#1C1C1C]">
                    {editingAddressId ? "Edit Address" : "Add a New Address"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Label">
                      <select
                        value={addressDraft.label}
                        onChange={(e) => setAddressDraft({ ...addressDraft, label: e.target.value })}
                        className="input-field"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Full Name">
                      <input
                        required
                        value={addressDraft.full_name}
                        onChange={(e) => setAddressDraft({ ...addressDraft, full_name: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        required
                        pattern="[6-9][0-9]{9}"
                        value={addressDraft.phone}
                        onChange={(e) => setAddressDraft({ ...addressDraft, phone: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                    <Field label="PIN Code">
                      <input
                        required
                        pattern="[1-9][0-9]{5}"
                        value={addressDraft.pincode}
                        onChange={(e) => setAddressDraft({ ...addressDraft, pincode: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Address Line 1">
                        <input
                          required
                          value={addressDraft.address_line1}
                          onChange={(e) => setAddressDraft({ ...addressDraft, address_line1: e.target.value })}
                          className="input-field"
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Address Line 2 (optional)">
                        <input
                          value={addressDraft.address_line2 ?? ""}
                          onChange={(e) => setAddressDraft({ ...addressDraft, address_line2: e.target.value })}
                          className="input-field"
                        />
                      </Field>
                    </div>
                    <Field label="City">
                      <input
                        required
                        value={addressDraft.city}
                        onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                    <Field label="State">
                      <input
                        required
                        value={addressDraft.state}
                        onChange={(e) => setAddressDraft({ ...addressDraft, state: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#1C1C1C]">
                    <input
                      type="checkbox"
                      checked={addressDraft.is_default}
                      onChange={(e) => setAddressDraft({ ...addressDraft, is_default: e.target.checked })}
                      className="h-4 w-4 accent-[#95271D]"
                    />
                    Set as default delivery address
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="inline-flex items-center gap-1.5 rounded bg-[#95271D] px-5 py-2 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors disabled:opacity-50"
                    >
                      {savingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Address
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddress}
                      className="rounded border border-[#E5D5C5] bg-white px-5 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 && !addressDraft ? (
                <StorefrontEmptyState
                  icon={MapPin}
                  title="No saved addresses"
                  message="Save delivery addresses to check out faster next time."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="relative rounded-sm border border-[#E5D5C5]/60 bg-white p-5"
                    >
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                          <BadgeCheck className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      <div className="mt-2 space-y-0.5 text-sm text-[#1C1C1C]">
                        <p className="font-semibold">{addr.full_name}</p>
                        <p className="text-[#6B6B6B]">{addr.phone}</p>
                        <p className="text-[#6B6B6B]">{addr.address_line1}</p>
                        {addr.address_line2 && <p className="text-[#6B6B6B]">{addr.address_line2}</p>}
                        <p className="text-[#6B6B6B]">
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                        <p className="text-[#6B6B6B]">{addr.country}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-3 border-t border-[#E5D5C5]/60 pt-3 text-xs font-medium">
                        <button
                          onClick={() => startEditAddress(addr)}
                          className="inline-flex items-center gap-1 text-[#95271D] hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteAddress(addr.id)}
                          className="inline-flex items-center gap-1 text-[#C41E3A] hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INFLUENCER */}
          {tab === "influencer" && (
            <div className="max-w-2xl">
              <h2 className="mb-4 text-lg font-semibold text-[#1C1C1C]">Influencer Program</h2>
              <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#95271D]/10">
                    <Gift className="h-5 w-5 text-[#95271D]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#1C1C1C]">Aanchal Influencer Program</h2>
                    <p className="text-xs text-[#6B6B6B]">
                      Share your code, earn commission on every sale.
                    </p>
                  </div>
                </div>

                {influencerStatus ? (
                  <div className="mt-5 space-y-3">
                    {influencerStatus.status === "approved" && (
                      <div className="rounded-sm bg-green-50 border border-green-200 p-4">
                        <p className="text-sm font-medium text-green-800">
                          You&apos;re approved!
                        </p>
                        <p className="mt-1 text-xs text-green-700">Your referral code:</p>
                        <div className="mt-2 flex items-center gap-2">
                          <p className="inline-block rounded border border-green-300 bg-white px-4 py-2 font-mono text-lg font-bold tracking-widest text-[#1C1C1C]">
                            {influencerStatus.referral_code}
                          </p>
                          <button
                            onClick={() => copyCode(influencerStatus.referral_code ?? "")}
                            className="text-green-700 hover:text-green-900"
                            aria-label="Copy referral code"
                          >
                            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-green-700">
                          Share this code — friends get 10% off (up to ₹500) and you earn 10% commission on their paid order.
                        </p>

                        {influencerStatus.earnings && (
                          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-green-200 pt-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-green-700">Orders</p>
                              <p className="text-base font-semibold text-green-800">{influencerStatus.earnings.orders}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-green-700">Earned</p>
                              <p className="text-base font-semibold text-green-800">
                                ₹{influencerStatus.earnings.total.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-green-700">Pending</p>
                              <p className="text-base font-semibold text-amber-700">
                                ₹{influencerStatus.earnings.pending.toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        )}

                        <Link
                          href="/influencer/dashboard"
                          className="mt-4 inline-flex items-center gap-2 rounded bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors"
                        >
                          Open Influencer Panel
                          <ArrowRight className="h-4 w-4" />
                        </Link>

                        {influencerEarnings.length > 0 && (
                          <div className="mt-4 border-t border-green-200 pt-3">
                            <p className="mb-2 text-[10px] uppercase tracking-wide text-green-700">
                              Recent commissions
                            </p>
                            <div className="space-y-1.5">
                              {influencerEarnings.slice(0, 5).map((row) => (
                                <div
                                  key={row.id}
                                  className="flex items-center justify-between text-xs text-green-800"
                                >
                                  <span className="font-mono">
                                    {row.order_id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className="text-green-700">
                                    {row.status === "pending" ? "Pending" : row.status === "paid" ? "Paid" : "Cancelled"} · ₹
                                    {row.commission_amount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {influencerStatus.status === "pending" && (
                      <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-800">
                          Application under review
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          We&apos;ll review your application within 2-3 business days. You&apos;ll receive your referral code once approved.
                        </p>
                      </div>
                    )}
                    {influencerStatus.status === "rejected" && (
                      <div className="rounded-sm border border-[#C41E3A]/20 bg-[#C41E3A]/5 p-4">
                        <p className="text-sm font-medium text-[#C41E3A]">
                          Application not approved
                        </p>
                        <p className="mt-1 text-xs text-[#6B6B6B]">
                          Please contact us at hello@aanchal.in if you believe this is a mistake.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5">
                    <p className="text-sm text-[#6B6B6B]">
                      You haven&apos;t applied yet. Join our influencer program and start earning.
                    </p>
                    <Link
                      href="/influencer/apply"
                      className="mt-4 inline-flex items-center gap-2 rounded bg-[#95271D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors"
                    >
                      Apply Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="mb-4 text-lg font-semibold text-[#1C1C1C]">Profile & Settings</h2>
                <form
                  onSubmit={saveProfile}
                  className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-[#1C1C1C]">Personal Information</h3>
                  <Field label="Full Name">
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={profile?.email ?? ""}
                      disabled
                      className="input-field bg-stone-100 text-[#6B6B6B]"
                    />
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Email is used to log in and cannot be changed here.
                    </p>
                  </Field>
                  <Field label="Phone">
                    <input
                      pattern="[6-9][0-9]{9}"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field"
                      placeholder="10-digit mobile number"
                    />
                  </Field>
                  {profileMsg && (
                    <p className={`text-sm ${profileMsg.ok ? "text-green-700" : "text-[#C41E3A]"}`}>
                      {profileMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 rounded bg-[#95271D] px-5 py-2 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </form>
              </div>

              <form
                onSubmit={changePassword}
                className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6 space-y-4"
              >
                <h3 className="text-sm font-semibold text-[#1C1C1C]">Change Password</h3>
                <Field label="New Password">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                  />
                </Field>
                <Field label="Confirm New Password">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                  />
                </Field>
                {passwordMsg && (
                  <p className={`text-sm ${passwordMsg.ok ? "text-green-700" : "text-[#C41E3A]"}`}>
                    {passwordMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded bg-[#1C1C1C] px-5 py-2 text-sm font-medium text-white hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#6B6B6B]">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Package,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  Truck,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatPrice, getOrderStatusLabel } from "@/lib/utils";

const CANCELLABLE_STATUSES = ["pending", "confirmed", "in_production", "ready_to_ship", "shipped", "out_for_delivery"];

type OrderItem = {
  product_id: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type HistoryEntry = {
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by: string;
  created_at: string;
};

type TrackingEvent = {
  status: string;
  currentStatus: string;
  location: string | null;
  datetime: string | null;
};

type OrderData = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  discount_amount: number;
  prepaid_amount: number;
  cod_amount: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_id: string | null;
  tracking_url: string | null;
  shipping_provider: string | null;
  tracking_events?: TrackingEvent[];
  order_items: OrderItem[];
  order_status_history: HistoryEntry[];
};

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "in_production",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order") ?? "";
  const initialEmail = searchParams.get("email") ?? "";
  const initialStatusToken = searchParams.get("token") ?? "";
  const statusToken = initialStatusToken;

  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState(initialEmail);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ message: string; refundNote?: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fetchOrder = async (id: string, emailInput: string, token?: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, email: emailInput, statusToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to find this order.");
        return;
      }
      setOrder(data.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) {
      setError("Enter both your order ID and email.");
      return;
    }
    setCancelResult(null);
    setConfirmCancel(false);
    fetchOrder(orderId.trim(), email.trim());
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          email,
          statusToken: statusToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.code === "AUTH_REQUIRED") {
          setError(
            "You must be signed in with the email used at checkout to cancel. " +
              "You can also use the confirmation link from your order email to cancel without signing in."
          );
        } else {
          setError(data.error ?? "Unable to cancel this order.");
        }
        setCancelling(false);
        return;
      }
      setCancelResult(data.data);
      setConfirmCancel(false);
      await fetchOrder(order.id, email, statusToken || undefined);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Auto-fetch when arriving from account links with query params.
  useEffect(() => {
    if (initialOrderId && initialEmail) {
      fetchOrder(initialOrderId, initialEmail, initialStatusToken || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl text-[#1C1C1C]">Track Your Order</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Enter your order ID and the email you used at checkout to see the latest status.
        </p>
      </div>

      {/* Lookup form */}
      <form
        onSubmit={handleSubmit}
        className="mt-8 grid grid-cols-1 gap-4 rounded-sm border border-[#E5D5C5]/60 bg-white p-6 sm:grid-cols-3"
      >
        <div className="sm:col-span-1">
          <label htmlFor="order-id" className="mb-1 block text-xs font-medium text-[#1C1C1C]">
            Order ID
          </label>
          <input
            id="order-id"
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. abc123..."
            className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="order-email" className="mb-1 block text-xs font-medium text-[#1C1C1C]">
            Email
          </label>
          <input
            id="order-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" fullWidth loading={loading}>
            <Search className="h-4 w-4" /> Track Order
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 px-4 py-3 text-sm text-[#C41E3A]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-6">
          {/* Status card */}
          <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-medium text-[#1C1C1C]">
                  {order.order_number ?? order.id}
                </p>
                <p className="mt-1 text-sm text-[#6B6B6B]">Placed {formatDate(order.created_at)}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#95271D]/10 px-3 py-1 text-xs font-semibold text-[#95271D]">
                <Package className="h-3.5 w-3.5" />
                {getOrderStatusLabel(order.order_status)}
              </span>
            </div>

            {/* Timeline */}
            {!["cancelled", "returned", "refunded"].includes(order.order_status) ? (
              <div className="mt-6">
                <ol className="space-y-0">
                  {STATUS_STEPS.map((step, idx) => {
                    const stepIndex = STATUS_STEPS.indexOf(step as (typeof STATUS_STEPS)[number]);
                    const currentIndex = STATUS_STEPS.indexOf(
                      (order.order_status as (typeof STATUS_STEPS)[number]) ?? "pending"
                    );
                    const reached = stepIndex <= currentIndex;
                    const isCurrent = stepIndex === currentIndex;
                    return (
                      <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
                        {idx < STATUS_STEPS.length - 1 && (
                          <span
                            className={`absolute left-[11px] top-5 h-full w-px ${
                              stepIndex < currentIndex ? "bg-[#95271D]" : "bg-[#E5D5C5]"
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            reached ? "bg-[#95271D] text-white" : "bg-[#F5EBE1] text-[#6B6B6B]"
                          }`}
                        >
                          {reached && !isCurrent ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : reached ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-current" />
                          )}
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${reached ? "text-[#1C1C1C]" : "text-[#6B6B6B]/60"}`}>
                            {getOrderStatusLabel(step)}
                          </p>
                          {isCurrent && order.shipped_at && step === "shipped" && (
                            <p className="text-xs text-[#6B6B6B]">{formatDate(order.shipped_at)}</p>
                          )}
                          {isCurrent && order.delivered_at && step === "delivered" && (
                            <p className="text-xs text-[#6B6B6B]">{formatDate(order.delivered_at)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <div className="mt-6 rounded-sm bg-[#C41E3A]/5 border border-[#C41E3A]/20 p-4 text-sm text-[#C41E3A]">
                This order has been {order.order_status === "return_requested" ? "marked for return" : getOrderStatusLabel(order.order_status)}.
                Contact us at hello@aanchal.in for details.
              </div>
            )}

            {/* Tracking info */}
            {order.tracking_id && (
              <div className="mt-4 flex items-center gap-3 rounded-sm bg-[#FFF0E8] p-3 text-sm">
                <Truck className="h-5 w-5 text-[#95271D]" />
                <div>
                  <p className="text-[#1C1C1C]">
                    {order.shipping_provider ?? "Courier"}: <span className="font-mono">{order.tracking_id}</span>
                  </p>
                  {order.tracking_url && (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#95271D] underline"
                    >
                      Track with courier →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Live courier events */}
            {order.tracking_events && order.tracking_events.length > 0 && (
              <div className="mt-4 rounded-sm border border-[#E5D5C5]/60 bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1C1C1C]">
                  Courier Updates
                </h3>
                <ol className="mt-3 space-y-3">
                  {order.tracking_events
                    .slice()
                    .reverse()
                    .map((event, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[#95271D]" />
                        <div className="text-sm">
                          <p className="font-medium text-[#1C1C1C]">
                            {event.currentStatus || event.status || "Update"}
                          </p>
                          <p className="text-xs text-[#6B6B6B]">
                            {[event.location, event.datetime].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              </div>
            )}

            {/* Cancel order */}
            {CANCELLABLE_STATUSES.includes(order.order_status) && (
              <div className="mt-4 border-t border-[#E5D5C5]/50 pt-4">
                {cancelResult ? (
                  <div className="rounded-sm border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="font-medium text-green-800">{cancelResult.message}</p>
                    {cancelResult.refundNote && <p className="mt-1 text-xs text-green-700">{cancelResult.refundNote}</p>}
                  </div>
                ) : confirmCancel ? (
                  <div className="rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 p-4">
                    <p className="text-sm text-[#1C1C1C]">
                      Are you sure you want to cancel this order?
                      {order.order_status === "shipped" || order.order_status === "out_for_delivery"
                        ? " Since it has already been dispatched, a 15% deduction will apply."
                        : " Cancellation before dispatch is free."}
                    </p>
                    <div className="mt-3 flex gap-3">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleCancel}
                        loading={cancelling}
                      >
                        Yes, Cancel Order
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setConfirmCancel(false)}>
                        Keep Order
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="text-sm font-medium text-[#C41E3A] hover:underline"
                  >
                    Cancel this order
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
              Items ({order.order_items.length})
            </h2>
            <ul className="mt-4 space-y-4">
              {order.order_items.map((item, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-[#FFF0E8]">
                    <Image
                      src={item.image_url ?? "/images/product-placeholder.svg"}
                      alt={item.product_name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1C]">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-[#6B6B6B]">
                      {[item.size, item.color].filter(Boolean).join(" · ")} • Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#1C1C1C]">{formatPrice(item.line_total)}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment + address */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                <CreditCard className="h-4 w-4 text-[#95271D]" /> Payment
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#6B6B6B]">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <dt>Discount</dt>
                    <dd>-{formatPrice(order.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-[#6B6B6B]">
                  <dt>Shipping</dt>
                  <dd>{formatPrice(order.shipping_fee)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-[#1C1C1C]">
                  <dt>Total</dt>
                  <dd>{formatPrice(order.total_amount)}</dd>
                </div>
                <div className="pt-2 text-xs text-[#6B6B6B]">
                  Payment: <span className="font-medium capitalize">{order.payment_method}</span>
                  {order.payment_method === "cod" && (
                    <span className="block text-orange-600">
                      Pay now: {formatPrice(order.prepaid_amount)} • Due on delivery: {formatPrice(order.cod_amount)}
                    </span>
                  )}
                </div>
              </dl>
            </div>

            <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                <MapPin className="h-4 w-4 text-[#95271D]" /> Shipping Address
              </h2>
              <address className="mt-4 text-sm not-italic text-[#1C1C1C]">
                {order.customer_name}
                <br />
                {order.address_line1}
                {order.address_line2 && (
                  <>
                    <br />
                    {order.address_line2}
                  </>
                )}
                <br />
                {order.city}, {order.state} — {order.pincode}
              </address>
            </div>
          </div>
        </div>
      )}

      {!order && !loading && !error && (
        <p className="mt-8 text-center text-xs text-[#6B6B6B]">
          Signed in? Your orders also appear under{" "}
          <Link href="/account" className="font-medium text-[#95271D] hover:underline">
            My Account
          </Link>
          .
        </p>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <IndianRupee className="mx-auto h-8 w-8 animate-pulse text-[#95271D]" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}

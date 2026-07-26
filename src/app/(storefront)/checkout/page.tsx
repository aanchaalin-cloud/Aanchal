"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import type { CheckoutFormData, RazorpayOrderResponse } from "@/types";
import { Messages } from "@/lib/messages";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

type FormErrors = Partial<Record<keyof CheckoutFormData, string>>;

function validate(data: CheckoutFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.customer_name || data.customer_name.length < 2)
    errors.customer_name = "Name is required";
  if (!data.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email))
    errors.customer_email = "Valid email required";
  if (!data.customer_phone || !/^[6-9]\d{9}$/.test(data.customer_phone))
    errors.customer_phone = "Valid 10-digit Indian mobile number required";
  if (!data.address_line1 || data.address_line1.length < 5)
    errors.address_line1 = "Address is required";
  if (!data.city) errors.city = "City is required";
  if (!data.state) errors.state = "State is required";
  if (!data.pincode || !/^\d{6}$/.test(data.pincode))
    errors.pincode = "Valid 6-digit pincode required";
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isHydrated, clearCart } = useCart();

  const [form, setForm] = useState<CheckoutFormData>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const displaySubtotal = items.reduce(
    (sum, item) => sum + item.display_price * item.quantity,
    0
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CheckoutFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (items.length === 0) {
      setApiError(Messages.emptyCart);
      return;
    }

    setLoading(true);

    try {
      const cartItems = items.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      }));

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cartItems }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setApiError(data.error ?? Messages.orderCreateError);
        setLoading(false);
        return;
      }

      const orderData = data.data as RazorpayOrderResponse;

      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        setApiError(Messages.paymentNotConfigured);
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Aanchal",
        description: "Order Payment",
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone,
        },
        theme: { color: "#800020" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/checkout/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            clearCart();
            const params = new URLSearchParams({
              orderId: orderData.orderId,
              statusToken: orderData.statusToken,
            });
            router.push(`/order-success?${params.toString()}`);
          } else {
            setApiError(
              verifyData.error ?? Messages.paymentVerificationFailed
            );
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      rzp.on("payment.failed", () => {
        setApiError(Messages.paymentError);
        setLoading(false);
      });

      rzp.open();
    } catch {
      setApiError(Messages.somethingWentWrong);
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#800020]/20" />
        <p className="mt-4 text-sm text-[#6B6B6B]">Loading checkout…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <StorefrontEmptyState
        title="Your cart is empty"
        message={Messages.emptyCartCheckout}
        actionLabel="Browse Products"
        actionHref="/shop"
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold text-[#1C1C1C]">
        Checkout
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Full Name *"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  error={errors.customer_name}
                  autoComplete="name"
                />
                <Field
                  label="Email *"
                  name="customer_email"
                  type="email"
                  value={form.customer_email}
                  onChange={handleChange}
                  error={errors.customer_email}
                  autoComplete="email"
                />
                <Field
                  label="Mobile Number *"
                  name="customer_phone"
                  type="tel"
                  value={form.customer_phone}
                  onChange={handleChange}
                  error={errors.customer_phone}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                />
              </div>
            </section>

            <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Address Line 1 *"
                    name="address_line1"
                    value={form.address_line1}
                    onChange={handleChange}
                    error={errors.address_line1}
                    autoComplete="address-line1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Address Line 2 (optional)"
                    name="address_line2"
                    value={form.address_line2 ?? ""}
                    onChange={handleChange}
                    autoComplete="address-line2"
                  />
                </div>
                <Field
                  label="City *"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  error={errors.city}
                  autoComplete="address-level2"
                />
                <div>
                  <label className="block text-xs font-medium text-[#1C1C1C] mb-1">
                    State *
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    aria-label="State"
                    className={`w-full rounded border px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] ${
                      errors.state ? "border-[#C41E3A]" : "border-[#E5D5C5]"
                    }`}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-xs text-[#C41E3A]">{errors.state}</p>
                  )}
                </div>
                <Field
                  label="Pincode *"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  error={errors.pincode}
                  placeholder="6-digit pincode"
                  autoComplete="postal-code"
                />
              </div>
            </section>

            <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
              <label className="block text-xs font-medium text-[#1C1C1C] mb-1">
                Order Notes (optional)
              </label>
              <textarea
                name="notes"
                value={form.notes ?? ""}
                onChange={handleChange}
                rows={3}
                placeholder="Any special instructions..."
                className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </section>

            {apiError && (
              <div className="rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 px-4 py-3 text-sm" role="alert">
                <p className="font-medium text-[#C41E3A]">Unable to complete checkout</p>
                <p className="mt-0.5 text-[#6B6B6B]">{apiError}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-sm border border-[#E5D5C5]/50 bg-white p-5 sticky top-24">
              <h2 className="text-lg font-semibold text-[#1C1C1C] mb-4">
                Order Summary
              </h2>

              <ul className="space-y-3 text-sm">
                {items.map((item) => (
                  <li
                    key={`${item.product_id}-${item.variant_id}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-[#6B6B6B] line-clamp-2">
                      {item.product_name}
                      {item.selected_size && ` (${item.selected_size}`}
                      {item.selected_color && !item.selected_size && ` (${item.selected_color}`}
                      {item.selected_color && item.selected_size && `, ${item.selected_color}`}
                      {(item.selected_size || item.selected_color) && ")"}
                      {" ×"}{item.quantity}
                    </span>
                    <span className="font-medium text-[#1C1C1C] whitespace-nowrap">
                      {formatPrice(item.display_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-[#E5D5C5]/50 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal (approx.)</span>
                  <span>{formatPrice(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Shipping</span>
                  <span className="text-xs text-[#6B6B6B]">Calculated at payment</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#6B6B6B]">
                Final amount is calculated securely server-side.
              </p>

              <div className="mt-5">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  disabled={items.length === 0}
                >
                  {loading ? "Processing…" : "Pay Securely with Razorpay"}
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#6B6B6B]">
                <span className="inline-block h-4 w-4 rounded-full bg-green-100 text-green-700 text-center leading-4 font-bold">✓</span>
                <span>100% secure payment via Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
};

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-[#1C1C1C] mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020] ${
          error ? "border-[#C41E3A]" : "border-[#E5D5C5]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-[#C41E3A]">{error}</p>}
    </div>
  );
}
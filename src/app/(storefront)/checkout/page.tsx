"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import MeasurementForm from "@/components/checkout/MeasurementForm";
import type { CheckoutFormData, MeasurementData } from "@/types";
import { Messages } from "@/lib/messages";
import {
  User, MapPin, Ruler, Check, ArrowLeft,
  Tag, ShoppingBag, Truck, BadgePercent, Megaphone,
  MessageCircle
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh",
];

const STEPS = [
  { id: 1, label: "Information", icon: User },
  { id: 2, label: "Measurements", icon: Ruler },
  { id: 3, label: "Confirm", icon: Check },
];

type FormErrors = Partial<Record<keyof CheckoutFormData | "chest" | "waist" | "full_height" | "shoulder", string>>;

function formatHeight(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}' ${inches}"`;
}

function validateStep1(data: CheckoutFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.customer_name || data.customer_name.length < 2) errors.customer_name = "Name is required";
  if (!data.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) errors.customer_email = "Valid email required";
  if (!data.customer_phone || !/^[6-9]\d{9}$/.test(data.customer_phone)) errors.customer_phone = "Valid 10-digit Indian mobile number required";
  if (!data.address_line1 || data.address_line1.length < 5) errors.address_line1 = "Address is required";
  if (!data.city) errors.city = "City is required";
  if (!data.state) errors.state = "State is required";
  if (!data.pincode || !/^\d{6}$/.test(data.pincode)) errors.pincode = "Valid 6-digit pincode required";
  return errors;
}

function validateStep2(data: MeasurementData): FormErrors {
  const errors: FormErrors = {};
  if (!data.chest || data.chest < 1 || data.chest > 300) errors.chest = "Chest must be 1-300 inches";
  if (!data.waist || data.waist < 1 || data.waist > 300) errors.waist = "Waist must be 1-300 inches";
  if (!data.full_height || data.full_height < 1 || data.full_height > 120) errors.full_height = "Height must be up to 10 feet (120 inches)";
  if (!data.shoulder || data.shoulder < 1 || data.shoulder > 300) errors.shoulder = "Shoulder must be 1-300 inches";
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isHydrated, clearCart } = useCart();
  const [step, setStep] = useState(1);

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
  const [measurements, setMeasurements] = useState<MeasurementData>({
    chest: 0,
    waist: 0,
    full_height: 0,
    shoulder: 0,
    unit: "inches",
    personalisation_request: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const displaySubtotal = items.reduce(
    (sum, item) => sum + item.display_price * item.quantity, 0
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

  const handleNextStep = () => {
    setApiError(null);
    if (step === 1) {
      const stepErrors = validateStep1(form);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      const stepErrors = validateStep2(measurements);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    setApiError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: displaySubtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setCouponDiscount(data.data.discountAmount);
        setCouponApplied(true);
        setCouponError(null);
      } else {
        setCouponDiscount(0);
        setCouponApplied(false);
        setCouponError(data.error ?? Messages.couponInvalid);
      }
    } catch {
      setCouponError(Messages.somethingWentWrong);
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, displaySubtotal]);

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError(null);
  };

  const shippingFee = 0;
  const totalAmount = Math.max(0, displaySubtotal - couponDiscount) + shippingFee;

  const handleSubmit = async () => {
    setApiError(null);

    if (loading) return;

    if (items.length === 0) {
      setApiError(Messages.emptyCart);
      return;
    }

    const stepErrors = validateStep1(form);
    const measureErrors = validateStep2(measurements);
    const allErrors = { ...stepErrors, ...measureErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(Object.keys(measureErrors).length > 0 ? 2 : 1);
      return;
    }

    setLoading(true);

    try {
      const cartItems = items.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      }));

      const idempotencyKey = `co-whatsapp|${[
        couponApplied ? couponCode.trim().toUpperCase() : "",
        referralCode.trim().toUpperCase() || "",
        cartItems.map((i) => `${i.productId}:${i.variantId}:${i.quantity}`).join(","),
        `${measurements.chest}|${measurements.waist}|${measurements.full_height}|${measurements.shoulder}`,
        form.customer_email.trim().toLowerCase(),
      ].join("|")}`;

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          measurements,
          coupon_code: couponApplied ? couponCode.trim() : undefined,
          referral_code: referralCode.trim() || undefined,
          cartItems,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setApiError(data.error ?? Messages.orderCreateError);
        setLoading(false);
        return;
      }

      const orderData = data.data as {
        orderId: string;
        statusToken: string;
        confirmationMethod?: string;
        whatsappUrl?: string | null;
      };

      clearCart();

      // Always go to the order-success page — it renders the WhatsApp
      // confirmation card (Open WhatsApp + Copy buttons) plus the order
      // details. If WhatsApp doesn't open (desktop, no app), the customer
      // still sees their order number and can copy the message.
      const params = new URLSearchParams({
        orderId: orderData.orderId,
        statusToken: orderData.statusToken,
      });
      router.push(`/order-success?${params.toString()}`);
    } catch (err) {
      console.error("[checkout] Submit error:", err);
      setApiError(Messages.somethingWentWrong);
      setLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#95271D]/20" />
        <p className="mt-4 text-sm text-[#6B6B6B]">Loading checkout...</p>
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
      <h1 className="mb-6 text-3xl font-semibold text-[#1C1C1C]">Checkout</h1>

      {/* Step indicator */}
      <nav className="mb-8 flex items-center justify-center gap-2 sm:gap-4" aria-label="Checkout steps">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                step >= s.id
                  ? "bg-[#95271D] text-white"
                  : "bg-[#E5D5C5]/50 text-[#6B6B6B]"
              }`}>
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span className={`hidden text-xs font-medium sm:block ${
                step >= s.id ? "text-[#1C1C1C]" : "text-[#6B6B6B]"
              }`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-8 sm:w-12 ${
                step > s.id ? "bg-[#95271D]" : "bg-[#E5D5C5]"
              }`} />
            )}
          </div>
        ))}
      </nav>

      <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleSubmit(); }} noValidate>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: Customer Information */}
            {step === 1 && (
              <>
                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <User className="h-4 w-4 text-[#95271D]" />
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full Name *" name="customer_name" value={form.customer_name} onChange={handleChange} error={errors.customer_name} autoComplete="name" />
                    <Field label="Email *" name="customer_email" type="email" value={form.customer_email} onChange={handleChange} error={errors.customer_email} autoComplete="email" />
                    <Field label="Mobile Number *" name="customer_phone" type="tel" value={form.customer_phone} onChange={handleChange} error={errors.customer_phone} placeholder="10-digit mobile number" autoComplete="tel" />
                  </div>
                </section>

                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <MapPin className="h-4 w-4 text-[#95271D]" />
                    Shipping Address
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Address Line 1 *" name="address_line1" value={form.address_line1} onChange={handleChange} error={errors.address_line1} autoComplete="address-line1" />
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Address Line 2 (optional)" name="address_line2" value={form.address_line2 ?? ""} onChange={handleChange} autoComplete="address-line2" />
                    </div>
                    <Field label="City *" name="city" value={form.city} onChange={handleChange} error={errors.city} autoComplete="address-level2" />
                    <div>
                      <label className="block text-xs font-medium text-[#1C1C1C] mb-1">State *</label>
                      <select id="state" name="state" value={form.state} onChange={handleChange} aria-label="State"
                        className={`w-full rounded border px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#95271D] ${errors.state ? "border-[#C41E3A]" : "border-[#E5D5C5]"}`}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                      {errors.state && <p className="mt-1 text-xs text-[#C41E3A]">{errors.state}</p>}
                    </div>
                    <Field label="Pincode *" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} placeholder="6-digit pincode" autoComplete="postal-code" />
                  </div>
                </section>

                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <label className="block text-xs font-medium text-[#1C1C1C] mb-1">Order Notes (optional)</label>
                  <textarea name="notes" value={form.notes ?? ""} onChange={handleChange} rows={3}
                    placeholder="Any special instructions..."
                    className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]" />
                </section>
              </>
            )}

            {/* STEP 2: Measurements */}
            {step === 2 && (
              <MeasurementForm
                value={measurements}
                onChange={setMeasurements}
                errors={errors as Record<string, string>}
              />
            )}

            {/* STEP 3: Review & Confirm */}
            {step === 3 && (
              <>
                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    Confirm on WhatsApp
                  </h2>
                  <div className="rounded-sm bg-[#FFF0E8] p-4">
                    <p className="text-sm text-[#1C1C1C]">
                      After confirming, you&apos;ll be redirected to WhatsApp with your
                      full order details pre-filled. Send the message to us and our
                      team will confirm your order.
                    </p>
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Payment will be arranged separately after confirmation.
                    </p>
                  </div>
                </section>

                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <ShoppingBag className="h-4 w-4 text-[#95271D]" />
                    Review Your Order
                  </h2>
                  <ul className="space-y-3 text-sm">
                    {items.map((item) => (
                      <li key={`${item.product_id}-${item.variant_id}`} className="flex justify-between gap-2">
                        <span className="text-[#6B6B6B] line-clamp-2">
                          {item.product_name}
                          {item.selected_size && ` (${item.selected_size}`}
                          {item.selected_color && !item.selected_size && ` (${item.selected_color}`}
                          {item.selected_color && item.selected_size && `, ${item.selected_color}`}
                          {(item.selected_size || item.selected_color) && ")"}
                          {" x"}{item.quantity}
                        </span>
                        <span className="font-medium text-[#1C1C1C] whitespace-nowrap">
                          {formatPrice(item.display_price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 border-t border-[#E5D5C5]/50 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Subtotal</span>
                      <span>{formatPrice(displaySubtotal)}</span>
                    </div>
                    {couponApplied && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1"><BadgePercent className="h-3 w-3" /> Coupon discount</span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Shipping</span>
                      <span className="font-medium text-[#800020]">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
                    </div>
                    <div className="border-t border-[#E5D5C5]/50 pt-2 flex justify-between font-semibold text-[#1C1C1C]">
                      <span>Total</span>
                      <span>{formatPrice(totalAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-sm bg-[#FFF0E8] p-3">
                    <p className="text-xs text-[#6B6B6B]">
                      Custom fit: Chest {measurements.chest} in, Waist {measurements.waist} in, Height {formatHeight(measurements.full_height)}, Shoulder {measurements.shoulder} in
                    </p>
                    {measurements.personalisation_request && (
                      <p className="mt-1 text-xs text-[#6B6B6B] italic">
                        Note: {measurements.personalisation_request}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            {apiError && (
              <div className="rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 px-4 py-3 text-sm" role="alert">
                <p className="font-medium text-[#C41E3A]">Unable to complete checkout</p>
                <p className="mt-0.5 text-[#6B6B6B]">{apiError}</p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : <div />}
              {step < 3 ? (
                <Button type="button" onClick={handleNextStep}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" loading={loading} disabled={items.length === 0}>
                  {loading ? "Preparing your order..." : "Confirm Order"}
                </Button>
              )}
            </div>
            {step === 3 && (
              <p className="text-center text-xs text-[#6B6B6B]">
                No payment is taken here. You&apos;ll be redirected to WhatsApp to confirm
                your order — our team will verify and confirm it manually.
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-sm border border-[#E5D5C5]/50 bg-white p-5 sticky top-24 space-y-4">
              <h2 className="text-lg font-semibold text-[#1C1C1C]">Order Summary</h2>
              <ul className="space-y-2 text-sm">
                {items.map((item) => (
                  <li key={`${item.product_id}-${item.variant_id}`} className="flex justify-between gap-2">
                    <span className="text-[#6B6B6B] line-clamp-2 text-xs">
                      {item.product_name} x{item.quantity}
                    </span>
                    <span className="text-xs font-medium text-[#1C1C1C] whitespace-nowrap">
                      {formatPrice(item.display_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Coupon */}
              <div className="border-t border-[#E5D5C5]/50 pt-3">
                <label className="block text-xs font-medium text-[#1C1C1C] mb-1">
                  <Tag className="inline h-3 w-3 mr-1" /> Coupon Code
                </label>
                {couponApplied ? (
                  <div className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-3 py-2">
                    <span className="text-xs font-medium text-green-700">{couponCode.toUpperCase()} -{formatPrice(couponDiscount)}</span>
                    <button type="button" onClick={removeCoupon} className="text-xs text-[#C41E3A] hover:underline">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 rounded border border-[#E5D5C5] bg-white px-3 py-2 text-xs text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={applyCoupon} loading={couponLoading}>
                      Apply
                    </Button>
                  </div>
                )}
                {couponError && <p className="mt-1 text-xs text-[#C41E3A]">{couponError}</p>}
              </div>

              {/* Influencer referral */}
              <div className="border-t border-[#E5D5C5]/50 pt-3">
                <label htmlFor="referral-code" className="block text-xs font-medium text-[#1C1C1C] mb-1">
                  <Megaphone className="inline h-3 w-3 mr-1" /> Influencer Referral Code
                </label>
                <input
                  id="referral-code"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-xs text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]"
                />
                <p className="mt-1 text-xs text-[#6B6B6B]">
                  Have an influencer code? Apply 10% off (up to ₹500).
                </p>
              </div>

              <div className="border-t border-[#E5D5C5]/50 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal</span>
                  <span>{formatPrice(displaySubtotal)}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Coupon</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Shipping</span>
                  <span className="font-medium text-[#800020]">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
                </div>
              </div>

              <p className="text-xs text-[#6B6B6B]">
                Final amount is calculated securely server-side. Prices are verified at checkout.
              </p>
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

function Field({ label, name, value, onChange, error, type = "text", placeholder, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-[#1C1C1C] mb-1">{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D] ${error ? "border-[#C41E3A]" : "border-[#E5D5C5]"}`} />
      {error && <p className="mt-1 text-xs text-[#C41E3A]">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import MeasurementForm from "@/components/checkout/MeasurementForm";
import { CheckoutErrorBoundary } from "@/components/checkout/CheckoutErrorBoundary";
import type { CheckoutFormData, MeasurementData } from "@/types";
import { Messages } from "@/lib/messages";
import { getCitiesForState, validatePincode } from "@/lib/india-locations";
import {
  buildWhatsAppOrderMessage,
  getWhatsAppOrderLink,
  type WhatsAppOrderSummary,
} from "@/lib/whatsapp";
import {
  User, MapPin, Ruler, Check, ArrowLeft,
  ShoppingBag, Truck, MessageCircle,
  CheckCircle, Copy, ExternalLink, Tag, Megaphone, BadgePercent,
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

export default function CheckoutPageWrapper() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutPage />
    </CheckoutErrorBoundary>
  );
}

function CheckoutPage() {
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

  const [errors, setErrors] = useState<FormErrors>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<{ amount: number; code: string; isRewardVoucher: boolean } | null>(null);
  const [influencerCode, setInfluencerCode] = useState("");

  const [cities, setCities] = useState<string[]>([]);
  const [pincodeMap, setPincodeMap] = useState<Record<string, string[]>>({});
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const handleStateChange = useCallback((newState: string) => {
    setForm((prev) => ({ ...prev, state: newState, city: "", pincode: "" }));
    setPincodeError(null);
    if (!newState) {
      setCities([]);
      setPincodeMap({});
      return;
    }
    const { cities: fetched, pincodeMap: fetchedMap } = getCitiesForState(newState);
    setCities(fetched);
    setPincodeMap(fetchedMap);
  }, []);

  const handleCityChange = useCallback((newCity: string) => {
    setForm((prev) => ({ ...prev, city: newCity, pincode: "" }));
    setPincodeError(null);
  }, []);

  const handlePincodeBlur = useCallback(() => {
    const { state, city, pincode } = form;
    if (!state || !city || !pincode) return;
    const result = validatePincode(state, city, pincode, pincodeMap);
    setPincodeError(result.valid ? null : (result.error ?? null));
  }, [form, pincodeMap]);

  const displaySubtotal = items.reduce(
    (sum, item) => sum + item.display_price * item.quantity, 0
  );
  const shippingFee = 0;
  const discountAmount = couponDiscount?.amount ?? 0;
  const totalAmount = displaySubtotal - discountAmount;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "state") {
      handleStateChange(value);
      return;
    }
    if (name === "city") {
      handleCityChange(value);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "pincode") setPincodeError(null);
    if (errors[name as keyof CheckoutFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      const stepErrors = validateStep1(form);
      if (form.state && form.city && form.pincode) {
        const pcResult = validatePincode(form.state, form.city, form.pincode, pincodeMap);
        if (!pcResult.valid) {
          setPincodeError(pcResult.error ?? null);
          stepErrors.pincode = pcResult.error;
        }
      }
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setPincodeError(null);
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
    setStep((s) => Math.max(1, s - 1));
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) { setCouponError("Coupon code is required"); return; }

    setCouponValidating(true);
    setCouponError(null);
    setCouponDiscount(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal: displaySubtotal }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCouponError(json.error || "Invalid coupon code");
      } else {
        setCouponDiscount({
          amount: json.data.discountAmount,
          code: json.data.couponCode,
          isRewardVoucher: json.data.isRewardVoucher,
        });
      }
    } catch {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(null);
    setCouponError(null);
  };

  const handleSubmit = () => {
    if (items.length === 0) return;

    const stepErrors = validateStep1(form);
    const measureErrors = validateStep2(measurements);
    if (form.state && form.city && form.pincode) {
      const pcResult = validatePincode(form.state, form.city, form.pincode, pincodeMap);
      if (!pcResult.valid) {
        setPincodeError(pcResult.error! ?? null);
        stepErrors.pincode = pcResult.error;
      }
    }
    const allErrors = { ...stepErrors, ...measureErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(Object.keys(measureErrors).length > 0 ? 2 : 1);
      return;
    }

    if (couponCode.trim() && !couponDiscount) {
      setCouponError("Please validate your coupon code first");
      return;
    }

    setIsSubmitting(true);

    const summary: WhatsAppOrderSummary = {
      orderNumber: `TEMP-${Date.now()}`,
      customerName: form.customer_name,
      customerPhone: form.customer_phone,
      customerEmail: form.customer_email,
      items: items.map((item) => ({
        productName: item.product_name,
        variant: [item.selected_size, item.selected_color].filter(Boolean).join(" / ") || null,
        quantity: item.quantity,
        lineTotal: item.display_price * item.quantity,
      })),
      measurements: {
        unit: "inches",
        chest: measurements.chest,
        waist: measurements.waist,
        fullHeight: measurements.full_height,
        shoulder: measurements.shoulder,
        personalisationRequest: measurements.personalisation_request,
      },
      address: {
        line1: form.address_line1,
        line2: form.address_line2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      },
      subtotal: displaySubtotal,
      shippingFee,
      discountAmount: discountAmount,
      totalAmount,
      notes: form.notes,
    };

    const baseMessage = buildWhatsAppOrderMessage(summary);
    const extras: string[] = [];
    if (couponDiscount) {
      extras.push(`*Coupon:* ${couponDiscount.code} (₹${couponDiscount.amount} off)${couponDiscount.isRewardVoucher ? " [Reward Voucher]" : ""}`);
    }
    if (influencerCode.trim()) extras.push(`*Influencer Code:* ${influencerCode.trim()}`);
    const message = extras.length > 0
      ? baseMessage + "\n\n" + extras.join("\n")
      : baseMessage;

    const whatsappUrl = getWhatsAppOrderLink(message);

    window.open(whatsappUrl, "_blank");
    setWhatsappMessage(message);
    setOrderPlaced(true);
    setIsSubmitting(false);
    clearCart();
  };

  const handleCopy = () => {
    if (whatsappMessage) {
      navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  if (items.length === 0 && !orderPlaced) {
    return (
      <StorefrontEmptyState
        title="Your cart is empty"
        message={Messages.emptyCartCheckout}
        actionLabel="Browse Products"
        actionHref="/shop"
      />
    );
  }

  if (orderPlaced && whatsappMessage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h1 className="mt-6 text-3xl font-semibold text-[#1C1C1C]">
          Order Sent!
        </h1>
        <p className="mt-4 text-base text-[#6B6B6B]">
          Your order details have been sent via WhatsApp. Our team will confirm
          your order shortly. Payment will be arranged separately.
        </p>

        <div className="mt-6 rounded-sm border border-[#E5D5C5]/50 bg-white p-5 text-left">
          <p className="mb-3 text-sm font-medium text-[#1C1C1C]">
            Your Order Message
          </p>
          <pre className="whitespace-pre-wrap rounded bg-[#F5F5F5] p-3 text-xs text-[#6B6B6B] font-mono max-h-64 overflow-y-auto">
            {whatsappMessage}
          </pre>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => window.open(getWhatsAppOrderLink(whatsappMessage), "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open WhatsApp
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied!" : "Copy Message"}
          </Button>
        </div>

        <p className="mt-8 text-xs text-[#6B6B6B]">
          If WhatsApp did not open, copy the message above and send it manually
          to our WhatsApp number.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold text-[#1C1C1C]">Checkout</h1>

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
                    <div>
                      <label className="block text-xs font-medium text-[#1C1C1C] mb-1">State *</label>
                      <select id="state" name="state" value={form.state} onChange={handleChange} aria-label="State"
                        className={`w-full rounded border px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#95271D] ${errors.state ? "border-[#C41E3A]" : "border-[#E5D5C5]"}`}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                      {errors.state && <p className="mt-1 text-xs text-[#C41E3A]">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C1C1C] mb-1">City *</label>
                      <select id="city" name="city" value={form.city} onChange={handleChange} aria-label="City" disabled={!form.state}
                        className={`w-full rounded border px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#95271D] disabled:opacity-50 ${errors.city ? "border-[#C41E3A]" : "border-[#E5D5C5]"}`}>
                        <option value="">{form.state ? "Select city" : "Select state first"}</option>
                        {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                      {errors.city && <p className="mt-1 text-xs text-[#C41E3A]">{errors.city}</p>}
                    </div>
                    <Field label="Pincode *" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode || pincodeError || undefined} placeholder="6-digit pincode" onBlur={handlePincodeBlur} autoComplete="postal-code" />
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

            {step === 2 && (
              <MeasurementForm
                value={measurements}
                onChange={setMeasurements}
                errors={errors as Record<string, string>}
              />
            )}

            {step === 3 && (
              <>
                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <Tag className="h-4 w-4 text-[#95271D]" />
                    Apply Coupon Code
                  </h2>
                  {couponDiscount ? (
                    <div className="flex items-center justify-between rounded bg-green-50 px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-green-800">{couponDiscount.code}</span>
                        <span className="ml-2 text-sm text-green-700">
                          — ₹{couponDiscount.amount} off{couponDiscount.isRewardVoucher ? " (Reward Voucher)" : ""}
                        </span>
                      </div>
                      <button type="button" onClick={handleRemoveCoupon} className="text-xs text-[#C41E3A] underline hover:text-[#95271D]">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponError) setCouponError(null);
                          }}
                          placeholder="Enter coupon code"
                          maxLength={20}
                          disabled={couponValidating}
                          className="flex-1 rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D] disabled:opacity-50"
                        />
                        <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponValidating || !couponCode.trim()} className="shrink-0">
                          {couponValidating ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#95271D] border-t-transparent" />
                          ) : (
                            <BadgePercent className="h-4 w-4" />
                          )}
                          {couponValidating ? "Checking..." : "Apply"}
                        </Button>
                      </div>
                      {couponError && <p className="mt-1 text-xs text-[#C41E3A]">{couponError}</p>}
                    </>
                  )}
                </section>

                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <Megaphone className="h-4 w-4 text-[#95271D]" />
                    Influencer / Referral Code
                  </h2>
                  <input
                    type="text"
                    value={influencerCode}
                    onChange={(e) => setInfluencerCode(e.target.value)}
                    placeholder="Enter influencer or referral code (optional)"
                    maxLength={30}
                    className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D]"
                  />
                  {influencerCode.trim() && (
                    <p className="mt-1 text-xs text-green-700">
                      Code &quot;{influencerCode.trim()}&quot; will be included in your order message
                    </p>
                  )}
                </section>

                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    Confirm on WhatsApp
                  </h2>
                  <div className="rounded-sm bg-[#FFF0E8] p-4">
                    <p className="text-sm text-[#1C1C1C]">
                      Click &quot;Place Order on WhatsApp&quot; below and your order
                      details will be sent to our WhatsApp. Our team will confirm
                      your order manually.
                    </p>
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      No payment is collected here. Payment will be arranged
                      separately after confirmation.
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
                    {couponDiscount && (
                      <div className="flex justify-between text-green-700">
                        <span>Discount ({couponDiscount.code})</span>
                        <span>-{formatPrice(couponDiscount.amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> Shipping</span>
                      <span className="font-medium text-[#800020]">Free</span>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />
                      Place Order on WhatsApp
                    </>
                  )}
                </Button>
              )}
            </div>
            {step === 3 && (
              <p className="text-center text-xs text-[#6B6B6B]">
                No payment is taken here. You will be redirected to WhatsApp to confirm
                your order — our team will verify and confirm it manually.
              </p>
            )}
          </div>

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

              <div className="border-t border-[#E5D5C5]/50 pt-3 space-y-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-[#1C1C1C]">
                    <Tag className="h-3 w-3 text-[#95271D]" /> Coupon Code
                  </label>
                  {couponDiscount ? (
                    <div className="flex items-center justify-between rounded bg-green-50 px-3 py-2">
                      <span className="text-xs font-medium text-green-800">
                        {couponDiscount.code} — ₹{couponDiscount.amount} off
                      </span>
                      <button type="button" onClick={handleRemoveCoupon} className="text-xs text-[#C41E3A] underline hover:text-[#95271D]">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponError) setCouponError(null);
                          }}
                          placeholder="Code"
                          maxLength={20}
                          disabled={couponValidating}
                          className="flex-1 rounded border border-[#E5D5C5] bg-white px-2 py-1.5 text-xs text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-1 focus:ring-[#95271D] disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponValidating || !couponCode.trim()}
                          className="shrink-0 rounded border border-[#95271D] bg-[#95271D] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#7a1f17] disabled:opacity-50"
                        >
                          {couponValidating ? "..." : "Apply"}
                        </button>
                      </div>
                      {couponError && <p className="mt-1 text-[10px] text-[#C41E3A]">{couponError}</p>}
                    </>
                  )}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-[#1C1C1C]">
                    <Megaphone className="h-3 w-3 text-[#95271D]" /> Influencer Code
                  </label>
                  <input
                    type="text"
                    value={influencerCode}
                    onChange={(e) => setInfluencerCode(e.target.value)}
                    placeholder="Optional"
                    maxLength={30}
                    className="w-full rounded border border-[#E5D5C5] bg-white px-2 py-1.5 text-xs text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-1 focus:ring-[#95271D]"
                  />
                </div>
              </div>

              <div className="border-t border-[#E5D5C5]/50 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Subtotal</span>
                  <span>{formatPrice(displaySubtotal)}</span>
                </div>
                {couponDiscount && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount ({couponDiscount.code})</span>
                    <span>-{formatPrice(couponDiscount.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Shipping</span>
                  <span className="font-medium text-[#800020]">Free</span>
                </div>
                {couponDiscount && (
                  <div className="border-t border-[#E5D5C5]/50 pt-2 flex justify-between font-semibold text-[#1C1C1C]">
                    <span>Total</span>
                    <span>{formatPrice(totalAmount)}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#6B6B6B]">
                Final amount will be confirmed by our team on WhatsApp.
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
  onBlur?: () => void;
};

function Field({ label, name, value, onChange, error, type = "text", placeholder, autoComplete, onBlur }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-[#1C1C1C] mb-1">{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} onBlur={onBlur}
        className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#95271D] ${error ? "border-[#C41E3A]" : "border-[#E5D5C5]"}`} />
      {error && <p className="mt-1 text-xs text-[#C41E3A]">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import MeasurementForm from "@/components/checkout/MeasurementForm";
import type { CheckoutFormData, MeasurementData, RazorpayOrderResponse } from "@/types";
import { Messages } from "@/lib/messages";
import {
  User, MapPin, Ruler, CreditCard, Check, ArrowLeft,
  Tag, ShoppingBag, Truck, BadgePercent, Megaphone
} from "lucide-react";

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

const STEPS = [
  { id: 1, label: "Information", icon: User },
  { id: 2, label: "Measurements", icon: Ruler },
  { id: 3, label: "Payment", icon: CreditCard },
];

type FormErrors = Partial<Record<keyof CheckoutFormData | "chest" | "waist" | "full_height" | "shoulder", string>>;

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
  if (!data.chest || data.chest < 50 || data.chest > 150) errors.chest = "Chest must be 50-150 cm";
  if (!data.waist || data.waist < 40 || data.waist > 130) errors.waist = "Waist must be 40-130 cm";
  if (!data.full_height || data.full_height < 100 || data.full_height > 220) errors.full_height = "Height must be 100-220 cm";
  if (!data.shoulder || data.shoulder < 25 || data.shoulder > 70) errors.shoulder = "Shoulder must be 25-70 cm";
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isHydrated, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const idempotencyKey = useRef<string | null>(null);

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
    unit: "cm",
    personalisation_request: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");
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

  const shippingFee = 99;
  const discountedSubtotal = Math.max(0, displaySubtotal - couponDiscount);
  const totalAmount = discountedSubtotal + shippingFee;
  const prepaidAmount = paymentMethod === "cod" ? Math.ceil(totalAmount / 2) : totalAmount;
  const codAmount = paymentMethod === "cod" ? totalAmount - prepaidAmount : 0;

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

  const handleSubmit = async () => {
    setApiError(null);

    if (items.length === 0) {
      setApiError(Messages.emptyCart);
      return;
    }

    const stepErrors = validateStep1(form);
    const measureErrors = validateStep2(measurements);
    const allErrors = { ...stepErrors, ...measureErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      const cartItems = items.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      }));

      if (!idempotencyKey.current) {
        idempotencyKey.current = `co-${crypto.randomUUID()}`;
      }

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          measurements,
          payment_method: paymentMethod,
          coupon_code: couponApplied ? couponCode.trim() : undefined,
          referral_code: referralCode.trim() || undefined,
          cartItems,
          idempotency_key: idempotencyKey.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setApiError(data.error ?? Messages.orderCreateError);
        setLoading(false);
        return;
      }

      const orderData = data.data as RazorpayOrderResponse;

      const goToStatus = () => {
        clearCart();
        const params = new URLSearchParams({
          orderId: orderData.orderId,
          statusToken: orderData.statusToken,
        });
        router.push(`/order-success?${params.toString()}`);
      };

      // Already paid in a previous attempt — go straight to the status page.
      if (orderData.alreadyPaid) {
        goToStatus();
        return;
      }

      // Paytm — redirect to the Paytm payment page.
      if (orderData.paymentGateway === "paytm" && orderData.paytm) {
        clearCart();
        window.location.href = orderData.paytm.redirectUrl;
        return;
      }

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
        theme: { color: "#95271D" },
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
            goToStatus();
          } else {
            setApiError(verifyData.error ?? Messages.paymentVerificationFailed);
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => { setLoading(false); },
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

            {/* STEP 3: Payment & Review */}
            {step === 3 && (
              <>
                {/* Payment Method */}
                <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
                    <CreditCard className="h-4 w-4 text-[#95271D]" />
                    Payment Method
                  </h2>
                  <div className="space-y-3">
                    <PaymentOption
                      selected={paymentMethod === "prepaid"}
                      onClick={() => setPaymentMethod("prepaid")}
                      title="Full Prepaid"
                      subtitle="Pay 100% online now"
                      badge="5% OFF"
                      badgeColor="bg-green-100 text-green-800"
                      savings={`Save ${formatPrice(Math.round(displaySubtotal * 0.05))}`}
                    />
                    <PaymentOption
                      selected={paymentMethod === "cod"}
                      onClick={() => setPaymentMethod("cod")}
                      title="50% Prepaid + 50% COD"
                      subtitle="Pay half now, half on delivery"
                      badge="COD"
                      badgeColor="bg-orange-100 text-orange-800"
                      savings={`Pay ${formatPrice(Math.ceil(totalAmount / 2))} now`}
                    />
                  </div>
                </section>

                {/* Order Summary */}
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
                      <span>{formatPrice(shippingFee)}</span>
                    </div>
                    {paymentMethod === "prepaid" && displaySubtotal > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Prepaid discount (5%)</span>
                        <span>-{formatPrice(Math.round(totalAmount * 0.05))}</span>
                      </div>
                    )}
                    <div className="border-t border-[#E5D5C5]/50 pt-2 flex justify-between font-semibold text-[#1C1C1C]">
                      <span>Total</span>
                      <span>{formatPrice(paymentMethod === "prepaid" ? Math.round(totalAmount * 0.95) : totalAmount)}</span>
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[#6B6B6B]">
                          <span>Pay now (50%)</span>
                          <span className="font-medium text-[#1C1C1C]">{formatPrice(prepaidAmount)}</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Due on delivery (50%)</span>
                          <span className="font-medium">{formatPrice(codAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-sm bg-[#FFF0E8] p-3">
                    <p className="text-xs text-[#6B6B6B]">
                      Custom fit: Chest {measurements.chest} cm, Waist {measurements.waist} cm, Height {measurements.full_height} cm, Shoulder {measurements.shoulder} cm
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
                  {loading ? "Processing..." : paymentMethod === "cod" ? "Place Order" : "Pay Securely"}
                </Button>
              )}
            </div>
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
                  <span>{formatPrice(shippingFee)}</span>
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

type PaymentOptionProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  savings: string;
};

function PaymentOption({ selected, onClick, title, subtitle, badge, badgeColor, savings }: PaymentOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-sm border p-4 text-left transition-colors ${
        selected
          ? "border-[#95271D] bg-[#95271D]/5"
          : "border-[#E5D5C5] hover:border-[#95271D]/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
            selected ? "border-[#95271D]" : "border-[#E5D5C5]"
          }`}>
            {selected && <div className="h-2 w-2 rounded-full bg-[#95271D]" />}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1C1C1C]">{title}</p>
            <p className="text-xs text-[#6B6B6B]">{subtitle}</p>
            <p className="mt-1 text-xs text-[#6B6B6B]">{savings}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
      </div>
    </button>
  );
}

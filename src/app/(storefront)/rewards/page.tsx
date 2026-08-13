"use client";

import { useState } from "react";
import { Gift, Instagram, Facebook, Youtube, ExternalLink, CheckCircle, AlertCircle, Upload } from "lucide-react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "other", label: "Other", icon: ExternalLink },
] as const;

type Platform = (typeof PLATFORMS)[number]["id"];

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function RewardsPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [socialUrl, setSocialUrl] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [state, setState] = useState<SubmissionState>({ status: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ status: "submitting" });

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: customerName,
          customer_email: customerEmail,
          platform,
          social_url: socialUrl,
          review_body: reviewBody,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setState({ status: "error", message: data.error || "Something went wrong. Please try again." });
        return;
      }

      setState({
        status: "success",
        message: "Your submission has been received! Our team will review it within 2-3 business days. If approved, you'll receive a reward voucher via email.",
      });
    } catch {
      setState({ status: "error", message: "Network error. Please check your connection and try again." });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#95271D]/10">
          <Gift className="h-8 w-8 text-[#95271D]" />
        </div>
        <h1 className="text-3xl font-semibold text-[#1C1C1C]">Earn a Reward</h1>
        <p className="mt-2 text-sm text-[#6B6B6B] max-w-md mx-auto">
          Share your Aanchal experience on social media and earn a discount voucher for your next purchase.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-10 rounded-sm border border-[#E5D5C5]/50 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">How it works</h2>
        <ol className="space-y-3 text-sm text-[#6B6B6B]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">1</span>
            <span>Post a photo or story of your Aanchal outfit on any social media platform.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">2</span>
            <span>Submit your post details below with your order number.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">3</span>
            <span>Our team reviews it within 2-3 business days. Once approved, you receive a unique discount voucher via email.</span>
          </li>
        </ol>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-sm border border-[#E5D5C5]/50 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">Your Details</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="order-number" className="block text-xs font-medium text-[#1C1C1C] mb-1">Order Number *</label>
              <input
                id="order-number"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                placeholder="e.g., ANC-000001"
                className="w-full rounded-sm border border-[#E5D5C5] bg-white px-3 py-2.5 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-[#1C1C1C] mb-1">Full Name *</label>
              <input
                id="name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                minLength={2}
                placeholder="Your name as it appears on the order"
                className="w-full rounded-sm border border-[#E5D5C5] bg-white px-3 py-2.5 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#1C1C1C] mb-1">Email Address *</label>
              <input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-sm border border-[#E5D5C5] bg-white px-3 py-2.5 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
              />
              <p className="mt-1 text-[10px] text-[#6B6B6B]">We&apos;ll send your voucher to this email if approved.</p>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-[#E5D5C5]/50 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">Your Post</h2>

          <div className="space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-medium text-[#1C1C1C] mb-2">Platform *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2.5 text-xs font-medium transition-colors ${
                      platform === p.id
                        ? "border-[#95271D] bg-[#95271D]/5 text-[#95271D]"
                        : "border-[#E5D5C5] text-[#6B6B6B] hover:border-[#95271D]/50"
                    }`}
                  >
                    <p.icon className="h-4 w-4" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post URL */}
            <div>
              <label htmlFor="post-url" className="block text-xs font-medium text-[#1C1C1C] mb-1">Post URL *</label>
              <input
                id="post-url"
                type="url"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                required
                placeholder="https://instagram.com/p/..."
                className="w-full rounded-sm border border-[#E5D5C5] bg-white px-3 py-2.5 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
              />
              <p className="mt-1 text-[10px] text-[#6B6B6B]">Direct link to your post so our team can review it.</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-medium text-[#1C1C1C] mb-1">Description *</label>
              <textarea
                id="description"
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                required
                rows={3}
                minLength={20}
                maxLength={2000}
                placeholder="Tell us about your experience with the outfit... (at least 20 characters)"
                className="w-full rounded-sm border border-[#E5D5C5] bg-white px-3 py-2.5 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
              />
              <p className="mt-1 text-right text-[10px] text-[#6B6B6B]">{reviewBody.length}/2000</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {state.status === "success" && (
          <div className="rounded-sm border border-green-200 bg-green-50 p-4">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm text-green-800">{state.message}</p>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-800">{state.message}</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-[#95271D] px-6 py-3 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors disabled:opacity-50"
        >
          {state.status === "submitting" ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Submit for Review
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-[#6B6B6B]">
          By submitting, you confirm this is your original content and you have the right to share it.
        </p>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { PartyPopper, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const PLATFORMS = ["Instagram", "YouTube", "Facebook", "TikTok", "X (Twitter)", "Other"] as const;

const NICHES = [
  "Fashion & Style",
  "Beauty & Makeup",
  "Lifestyle & Vlogs",
  "Fitness & Wellness",
  "Wedding & Festive",
  "Dance & Performing",
  "Other",
] as const;

type VerifyState = "idle" | "checking" | "valid" | "invalid";

export default function InfluencerApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [platform, setPlatform] = useState<string>("Instagram");
  const [followers, setFollowers] = useState("");
  const [niche, setNiche] = useState("");
  const [desiredPromoCode, setDesiredPromoCode] = useState("");
  const [bio, setBio] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkVerify, setLinkVerify] = useState<VerifyState>("idle");
  const [linkVerifyMsg, setLinkVerifyMsg] = useState("");

  const verifyLink = (url: string, plat: string) => {
    if (!url) {
      setLinkVerify("idle");
      setLinkVerifyMsg("");
      return;
    }
    setLinkVerify("checking");
    setLinkVerifyMsg("");

    setTimeout(() => {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

        const platformDomains: Record<string, string[]> = {
          Instagram: ["instagram.com"],
          YouTube: ["youtube.com", "youtu.be"],
          Facebook: ["facebook.com", "fb.com"],
          TikTok: ["tiktok.com"],
          "X (Twitter)": ["twitter.com", "x.com"],
        };

        const allowed = platformDomains[plat];
        if (allowed && !allowed.some((d) => host === d || host.endsWith("." + d))) {
          setLinkVerify("invalid");
          setLinkVerifyMsg("This link is not a " + plat + " URL");
          return;
        }

        if (plat === "Instagram" && !parsed.pathname.match(/^\/[^\/]+\/?$/)) {
          setLinkVerify("invalid");
          setLinkVerifyMsg("Enter your profile link (instagram.com/yourhandle)");
          return;
        }

        setLinkVerify("valid");
        setLinkVerifyMsg("Link looks good");
      } catch {
        setLinkVerify("invalid");
        setLinkVerifyMsg("Enter a valid URL starting with https://");
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (linkVerify === "invalid") {
      setError("Please fix the social link before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/influencers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          social_handle: socialHandle,
          social_link: socialLink,
          platform,
          followers: followers || undefined,
          niche,
          desired_promo_code: desiredPromoCode || undefined,
          bio,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to submit. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <PartyPopper className="mx-auto h-12 w-12 text-green-600" />
        <h1 className="mt-6 font-display text-3xl text-[#1C1C1C]">Application Received!</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#6B6B6B]">
          Thank you, <span className="font-medium text-[#1C1C1C]">{fullName}</span>. Your application has been
          successfully submitted and is now under review. Our team will reach out to you at{" "}
          <span className="font-medium text-[#1C1C1C]">{email}</span> within 2-3 business days with an update.
        </p>
        <p className="mt-3 text-xs text-[#6B6B6B]">
          In the meantime, feel free to explore our collection.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/shop" className="inline-block rounded bg-[#95271D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#7A1F17] transition-colors">
            Browse Collection
          </Link>
          <Link href="/" className="inline-block rounded border border-[#95271D] px-6 py-3 text-sm font-semibold text-[#95271D] hover:bg-[#95271D]/5 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#95271D]";
  const labelCls = "mb-1 block text-xs font-medium text-[#6B6B6B]";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-[#1C1C1C]">Apply to Influencer Program</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Share your code, earn 10% commission on every sale. We review applications within 2-3 business days.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm">

        <div className="rounded-sm border border-[#E5D5C5] bg-[#FAF6F1] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1C1C1C] mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full-name" className={labelCls}>Full Name *</label>
              <input id="full-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputCls} placeholder="Priya Sharma" />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email *</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="you@example.com" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="phone" className={labelCls}>Phone Number *</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputCls} placeholder="10-digit mobile number" />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-[#E5D5C5] bg-[#FAF6F1] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1C1C1C] mb-3">Social Media Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="platform" className={labelCls}>Platform *</label>
              <select id="platform" value={platform} onChange={(e) => { setPlatform(e.target.value); if (socialLink) verifyLink(socialLink, e.target.value); }} required className={inputCls}>
                {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="social-handle" className={labelCls}>Username / Handle *</label>
              <input id="social-handle" type="text" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} required className={inputCls} placeholder="@yourhandle" />
            </div>
            <div>
              <label htmlFor="social-link" className={labelCls}>Profile / Page Link *</label>
              <div className="relative">
                <input id="social-link" type="url" value={socialLink} required
                  onChange={(e) => { setSocialLink(e.target.value); verifyLink(e.target.value, platform); }}
                  className={inputCls + " pr-9"} placeholder="https://instagram.com/yourhandle" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  {linkVerify === "checking" && <Loader2 className="h-4 w-4 animate-spin text-[#6B6B6B]" />}
                  {linkVerify === "valid" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  {linkVerify === "invalid" && <XCircle className="h-4 w-4 text-red-500" />}
                </span>
              </div>
              {linkVerifyMsg && (
                <p className={"mt-1 text-[11px] " + (linkVerify === "valid" ? "text-green-600" : "text-red-500")}>
                  {linkVerifyMsg}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="followers" className={labelCls}>Approximate Followers (optional)</label>
              <input id="followers" type="text" value={followers} onChange={(e) => setFollowers(e.target.value)} className={inputCls} placeholder="e.g. 5,000" />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-[#E5D5C5] bg-[#FAF6F1] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1C1C1C] mb-3">Content Details</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="niche" className={labelCls}>Content Niche *</label>
              <select id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} required className={inputCls}>
                <option value="">Select a niche</option>
                {NICHES.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="promo-code" className={labelCls}>Desired Promo Code (optional)</label>
              <input id="promo-code" type="text" value={desiredPromoCode} onChange={(e) => setDesiredPromoCode(e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. PRIYA10" />
              <p className="mt-1 text-[10px] text-[#6B6B6B]">A code your followers can use at checkout. We&apos;ll confirm availability.</p>
            </div>
            <div>
              <label htmlFor="bio" className={labelCls}>Tell us about yourself *</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} required rows={4} className={inputCls}
                placeholder="What kind of content do you create? Why do you love Aanchal?" />
              <p className="mt-1 text-[10px] text-[#6B6B6B]">{bio.length}/1000 characters</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
            <span className="mt-0.5 shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} disabled={linkVerify === "invalid"}>
          Submit Application
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6B6B6B]">
        Want to learn more first?{" "}
        <Link href="/influencer" className="font-medium text-[#95271D] hover:underline">
          See how it works
        </Link>
      </p>
    </div>
  );
}

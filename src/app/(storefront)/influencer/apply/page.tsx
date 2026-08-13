"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function InfluencerApplyPage() {
  const [socialHandle, setSocialHandle] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [followers, setFollowers] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const res = await fetch("/api/influencers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          social_handle: socialHandle,
          platform,
          followers: followers || undefined,
          bio,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to submit your application. Please try again.");
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

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-[#1C1C1C]">Apply to Influencer Program</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Share your code, earn 10% commission on every sale. We review applications within 2-3 business days.
        </p>
      </div>

      {success ? (
        <div className="rounded-sm border border-green-200 bg-green-50 p-6 text-center">
          <PartyPopper className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-4 font-semibold text-green-800">Application submitted!</p>
          <p className="mt-1 text-sm text-green-700">
            We&apos;ll review your application within 2-3 business days. Once approved, your referral code will
            appear on your account dashboard.
          </p>
          <Link
            href="/account?tab=influencer"
            className="mt-6 inline-block rounded bg-[#95271D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#7A1F17] transition-colors"
          >
            View My Application
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="social-handle" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Social Media Handle
            </label>
            <input
              id="social-handle"
              type="text"
              value={socialHandle}
              onChange={(e) => setSocialHandle(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="@yourhandle"
            />
          </div>

          <div>
            <label htmlFor="platform" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Platform
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              required
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#800020]"
            >
              <option value="Instagram">Instagram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="followers" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Approximate Followers (optional)
            </label>
            <input
              id="followers"
              type="text"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              autoComplete="off"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="e.g. 5,000"
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Tell us about yourself
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
              rows={4}
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="What kind of content do you create? Why do you love Aanchal?"
            />
            <p className="mt-1 text-[10px] text-[#6B6B6B]">{bio.length}/1000 characters</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Submit Application
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#6B6B6B]">
        Want to learn more first?{" "}
        <Link href="/influencer" className="font-medium text-[#800020] hover:underline">
          See how it works
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Package,
  Heart,
  Zap,
  Star,
  ChevronLeft,
  MailCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Messages } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

const RATE_LIMIT_KEY = "aanchal_login_attempts";
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 5 * 60 * 1000;

function getAttemptData() {
  if (typeof window === "undefined") return { count: 0, lockedUntil: 0 };
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

const BENEFITS = [
  {
    icon: Package,
    title: "Track every order",
    text: "See order status and delivery updates all in one place.",
  },
  {
    icon: Heart,
    title: "Saved wishlist",
    text: "Keep outfits you love and buy them whenever you're ready.",
  },
  {
    icon: Zap,
    title: "Faster checkout",
    text: "Your details are already filled in — no typing them again.",
  },
  {
    icon: Star,
    title: "Rewards & reviews",
    text: "Earn rewards and rate the pieces you receive.",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/account";
  const resetSent = searchParams.get("reset") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const attemptData = getAttemptData();
    if (attemptData.lockedUntil > Date.now()) {
      setLockedOut(true);
      setError("Too many attempts. Please wait 5 minutes.");
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const newCount = attemptData.count + 1;
      const lockout =
        newCount >= MAX_ATTEMPTS ? { lockedUntil: Date.now() + LOCKOUT_MS } : {};
      localStorage.setItem(
        RATE_LIMIT_KEY,
        JSON.stringify({ count: newCount, ...lockout })
      );
      setError(
        newCount >= MAX_ATTEMPTS
          ? "Too many failed attempts. Please wait 5 minutes."
          : `Invalid email or password. ${MAX_ATTEMPTS - newCount} attempts remaining.`
      );
      setLoading(false);
      return;
    }

    localStorage.removeItem(RATE_LIMIT_KEY);
    router.push(next);
    router.refresh();
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      return;
    }

    setForgotLoading(true);
    const supabase = createClient();
    const { error: forgotError } = await supabase.auth.resetPasswordForEmail(
      forgotEmail,
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setForgotLoading(false);

    if (forgotError) {
      setError(forgotError.message);
      return;
    }

    setForgotSent(true);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-16">
      <div className="grid gap-8 md:grid-cols-2 md:gap-0">
        {/* Form column */}
        <div className="rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm md:rounded-r-none md:border-r-0">
          {forgotOpen ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false);
                  setForgotSent(false);
                  setError(null);
                }}
                className="mb-4 flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#800020]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to sign in
              </button>

              <h1 className="font-display text-2xl text-[#1C1C1C]">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-[#6B6B6B]">
                We&apos;ll email you a secure link to choose a new password.
              </p>

              {forgotSent ? (
                <div className="mt-6 flex items-start gap-3 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#800020]" />
                  <p className="text-sm text-[#1C1C1C]">
                    If an account exists for{" "}
                    <span className="font-medium">{forgotEmail}</span>, a reset
                    link is on its way. Check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-1 block text-xs font-medium text-[#6B6B6B]"
                    >
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
                      placeholder="you@email.com"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" fullWidth loading={forgotLoading}>
                    Send Reset Link
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-display text-3xl text-[#1C1C1C]">
                  Sign In
                </h1>
                <p className="mt-2 text-sm text-[#6B6B6B]">
                  Welcome back to Aanchal.
                </p>
              </div>

              {resetSent && (
                <div className="mb-4 flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Your password has been updated. Please sign in.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-xs font-medium text-[#6B6B6B]"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
                    placeholder="you@email.com"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-[#6B6B6B]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(true);
                        setForgotEmail(email || "");
                        setError(null);
                      }}
                      className="text-xs font-medium text-[#800020] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" fullWidth loading={loading} disabled={lockedOut}>
                  Sign In
                </Button>

                {isSupabaseConfigured() && (
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      setLoading(true);
                      const supabase = createClient();
                      const { error: magicError } = await supabase.auth.signInWithOtp({
                        email,
                      });
                      setLoading(false);
                      if (magicError) {
                        setError(magicError.message);
                      } else {
                        setError(null);
                        alert(
                          "If an account exists for this email, a sign-in link has been sent. Check your inbox."
                        );
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 text-sm text-[#800020] hover:underline"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Sign in with a magic link
                  </button>
                )}
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E5D5C5]" />
                <span className="text-xs text-[#6B6B6B]">OR</span>
                <div className="h-px flex-1 bg-[#E5D5C5]" />
              </div>

              <Link
                href="/shop"
                className="flex w-full items-center justify-center gap-2 rounded-sm border border-[#D4C5B5] bg-white px-6 py-2.5 text-sm font-medium text-[#1C1C1C] hover:border-[#800020] hover:text-[#800020] transition-colors"
              >
                Continue as guest
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Benefits column */}
        <div className="rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm md:rounded-l-none md:border-l-0">
          <h2 className="font-display text-xl text-[#1C1C1C]">
            Why create an account?
          </h2>
          <ul className="mt-5 space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <benefit.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">
                    {benefit.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#6B6B6B]">
                    {benefit.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-[#E5D5C5]/60 pt-6">
            <p className="text-sm text-[#6B6B6B]">
              New to Aanchal?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#800020] hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          {!isSupabaseConfigured() && (
            <p className="mt-4 text-center text-xs text-[#6B6B6B]">
              {Messages.dbConfigError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

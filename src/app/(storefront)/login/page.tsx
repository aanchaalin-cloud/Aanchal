"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AlertCircle,
  ArrowRight,
  Lock,
  MailCheck,
  Package,
  Heart,
  Zap,
  Star,
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

  const [magicOpen, setMagicOpen] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  /* ── Email + Password Sign In ── */
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
    const identifier = email.trim();
    let authError: { message?: string } | null = null;

    if (identifier.includes("@")) {
      const res = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      authError = res.error;
    } else {
      const res = await fetch("/api/auth/username-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json().catch(() => ({}));
      authError =
        !res.ok || !json.success
          ? { message: json.error ?? "Invalid username or password." }
          : null;
    }

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
          : `Invalid email/username or password. ${MAX_ATTEMPTS - newCount} attempts remaining.`
      );
      setLoading(false);
      return;
    }

    localStorage.removeItem(RATE_LIMIT_KEY);

    if (identifier.includes("@")) {
      // Email path: signInWithPassword runs on the browser client, which fires
      // onAuthStateChange, so AuthContext updates immediately.
      router.push(next);
      router.refresh();
    } else {
      // Username path: the session is set server-side via cookies; the browser
      // Supabase client's onAuthStateChange never fires, leaving AuthContext
      // (and therefore the wishlist) stale. A full reload re-reads the session.
      window.location.href = next;
    }
  };

  /* ── Google Sign-In ── */
  const handleGoogle = async () => {
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      return;
    }
    const supabase = createClient();
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${next}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (googleError) setError(googleError.message);
  };

  /* ── Magic Link ── */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMagicLoading(true);

    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      setMagicLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setMagicLoading(false);

    if (magicError) {
      setError(magicError.message);
      return;
    }
    setMagicSent(true);
  };

  /* ── Forgot Password ── */
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

  /* ── Forgot Password View ── */
  if (forgotOpen) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
        <button
          type="button"
          onClick={() => {
            setForgotOpen(false);
            setForgotSent(false);
            setError(null);
          }}
          className="mb-6 flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#800020]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to sign in
        </button>

        <div className="rounded-lg border border-[#E5D5C5] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1C1C1C]">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>

          {forgotSent ? (
            <div className="mt-6 flex items-start gap-3 rounded-md border border-[#800020]/20 bg-[#800020]/5 px-4 py-3">
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
                  className="mb-1.5 block text-sm font-medium text-[#1C1C1C]"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input-field"
                  placeholder="you@email.com"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" fullWidth loading={forgotLoading}>
                Send Reset Link
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ── Magic Link Sent View ── */
  if (magicSent) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
        <div className="rounded-lg border border-[#E5D5C5] bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#800020]/10">
            <MailCheck className="h-6 w-6 text-[#800020]" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[#1C1C1C]">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            We sent a sign-in link to{" "}
            <span className="font-medium text-[#1C1C1C]">{email}</span>.
            Click the link in the email to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              setMagicSent(false);
              setMagicOpen(false);
            }}
            className="mt-6 text-sm font-medium text-[#800020] hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  /* ── Main Login View ── */
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* ── Left: Auth Card ── */}
        <div className="flex flex-col justify-center">
          <div className="rounded-lg border border-[#E5D5C5] bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-[#1C1C1C]">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-[#6B6B6B]">
                Sign in to your Aanchal account
              </p>
            </div>

            {resetSent && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Your password has been updated. Please sign in.</span>
              </div>
            )}

            {/* ── Google Sign-In ── */}
            {isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-md border border-[#D4C5B5] bg-white px-4 py-2.5 text-sm font-medium text-[#1C1C1C] transition-colors hover:border-[#800020] hover:bg-[#FFF0E8]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            )}

            {/* ── Divider ── */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5D5C5]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">or</span>
              <div className="h-px flex-1 bg-[#E5D5C5]" />
            </div>

            {/* ── Email + Password Form ── */}
            {magicOpen ? (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <p className="text-sm text-[#6B6B6B]">
                  Enter your email and we&apos;ll send you a sign-in link — no password needed.
                </p>
                <div>
                  <label
                    htmlFor="magic-email"
                    className="mb-1.5 block text-sm font-medium text-[#1C1C1C]"
                  >
                    Email address
                  </label>
                  <input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="input-field"
                    placeholder="you@email.com"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" fullWidth loading={magicLoading}>
                  Send Magic Link
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMagicOpen(false);
                    setError(null);
                  }}
                  className="w-full text-center text-sm text-[#6B6B6B] hover:text-[#800020]"
                >
                  Use password instead
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-[#1C1C1C]"
                  >
                    Email or username
                  </label>
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="input-field"
                    placeholder="you@email.com or username"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-[#1C1C1C]"
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
                    className="input-field"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={lockedOut}
                >
                  Sign In
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMagicOpen(true);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[#6B6B6B] hover:text-[#800020]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Sign in with magic link instead
                </button>
              </form>
            )}

            {/* ── Divider ── */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5D5C5]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">or</span>
              <div className="h-px flex-1 bg-[#E5D5C5]" />
            </div>

            {/* ── Create Account ── */}
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#800020] bg-[#800020] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#66001A]"
            >
              Create an account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ── Guest Link ── */}
          <p className="mt-4 text-center text-sm text-[#6B6B6B]">
            Just browsing?{" "}
            <Link
              href="/shop"
              className="font-medium text-[#800020] hover:underline"
            >
              Shop as guest
            </Link>
          </p>
        </div>

        {/* ── Right: Benefits ── */}
        <div className="hidden md:flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">
            Why create an account?
          </h2>
          <ul className="mt-6 space-y-5">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#800020]/10">
                  <benefit.icon className="h-4.5 w-4.5 text-[#800020]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">
                    {benefit.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#6B6B6B]">
                    {benefit.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

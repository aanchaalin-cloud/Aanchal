"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Messages } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

const RATE_LIMIT_KEY = "aanchal_admin_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

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

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    const data = getAttemptData();
    if (data.lockedUntil > Date.now()) {
      setLockedOut(true);
      setLockoutSeconds(Math.ceil((data.lockedUntil - Date.now()) / 1000));
    }
  }, []);

  useEffect(() => {
    if (!lockedOut) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((getAttemptData().lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedOut(false);
        setLockoutSeconds(0);
        clearInterval(interval);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedOut]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const attemptData = getAttemptData();
    if (attemptData.lockedUntil > Date.now()) {
      setLockedOut(true);
      setLockoutSeconds(Math.ceil((attemptData.lockedUntil - Date.now()) / 1000));
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
      const lockout = newCount >= MAX_ATTEMPTS ? { lockedUntil: Date.now() + LOCKOUT_MS } : {};
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: newCount, ...lockout }));

      if (newCount >= MAX_ATTEMPTS) {
        setLockedOut(true);
        setLockoutSeconds(Math.ceil(LOCKOUT_MS / 1000));
        setError("Too many failed attempts. Please wait 5 minutes.");
      } else {
        setError(`Invalid email or password. ${MAX_ATTEMPTS - newCount} attempts remaining.`);
      }
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Authentication failed.");
      setLoading(false);
      return;
    }

    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!adminRecord) {
      await supabase.auth.signOut();
      setError(Messages.unauthorizedAdmin);
      setLoading(false);
      return;
    }

    localStorage.removeItem(RATE_LIMIT_KEY);
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#1C1C1C]">
            Aanchal Admin
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Sign in to manage your store
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-sm border border-[#EDE0D4] p-8 space-y-4 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#6B6B6B] mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded border border-[#D4C5B5] px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent bg-white"
              placeholder="admin@yourbrand.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#6B6B6B] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded border border-[#D4C5B5] px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
              {error}
            </div>
          )}

          {lockedOut && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Too many attempts. Try again in {lockoutSeconds}s.
            </div>
          )}

          <Button type="submit" fullWidth loading={loading} disabled={lockedOut}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Messages } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      return;
    }

    const supabase = createClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setError(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else if (searchParams.get("error")) {
        setError("This reset link is invalid or has expired.");
      } else {
        setError("This reset link is invalid or has expired. Please request a new one.");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(Messages.dbConfigError);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=true");
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm">
        {ready ? (
          <>
            <h1 className="font-display text-2xl text-[#1C1C1C]">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-[#6B6B6B]">
              Pick a strong password you&apos;ll remember — at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs font-medium text-[#6B6B6B]"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1 block text-xs font-medium text-[#6B6B6B]"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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

              <Button type="submit" fullWidth loading={loading}>
                Update Password
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            {error ? (
              <>
                <AlertCircle className="h-8 w-8 text-[#C41E3A]" />
                <p className="text-sm text-[#1C1C1C]">{error}</p>
                <a
                  href="/login"
                  className="text-sm font-medium text-[#800020] hover:underline"
                >
                  Back to sign in
                </a>
              </>
            ) : (
              <>
                <Check className="h-8 w-8 text-[#800020]" />
                <p className="text-sm text-[#6B6B6B]">Verifying your link…</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Messages } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      setError("Invalid email or password.");
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

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
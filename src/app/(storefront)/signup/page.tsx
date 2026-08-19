"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || undefined,
          username: username || undefined,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to create account. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-[#1C1C1C]">Create Account</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Track orders, save your wishlist, and join the influencer program.
        </p>
      </div>

      {success ? (
        <div className="flex items-start gap-3 rounded-sm border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm text-green-800">
            Account created! You can now sign in.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-sm border border-[#EDE0D4] bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="full-name" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
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
            <label htmlFor="username" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Username (optional)
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="e.g. priya_sharma"
            />
            <p className="mt-1 text-[10px] text-[#6B6B6B]">
              Lowercase letters, numbers, underscores — 3-20 characters. You can sign in with it.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Mobile Number (optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="10-digit mobile number"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium text-[#6B6B6B]">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded border border-[#D4C5B5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800020]"
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-[#800020]/20 bg-[#800020]/5 px-4 py-3 text-sm text-[#800020]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>

          <p className="text-center text-[10px] text-[#6B6B6B]">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#6B6B6B]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#800020] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

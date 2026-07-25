"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[#FFF8F3]">
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#800020]/5">
            <AlertTriangle className="h-8 w-8 text-[#800020]" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-semibold text-[#1C1C1C]">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-[#6B6B6B]">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs font-mono text-[#800020]/40">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-8 flex gap-3">
            <button
              onClick={reset}
              className="rounded bg-[#800020] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded border border-[#800020]/20 px-5 py-2.5 text-sm font-medium text-[#800020] hover:bg-white transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

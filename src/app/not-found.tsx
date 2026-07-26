import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]/50">
        404 Error
      </p>
      <h1 className="mt-2 text-5xl font-semibold text-[#1C1C1C]">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-center text-[#6B6B6B]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}

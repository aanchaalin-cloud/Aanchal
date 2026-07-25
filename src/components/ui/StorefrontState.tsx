import Link from "next/link";
import { AlertCircle, ShoppingBag } from "lucide-react";

export function StorefrontErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#800020]/5">
        <AlertCircle className="h-8 w-8 text-[#800020]" />
      </div>
      <h1 className="mt-6 font-serif text-2xl font-semibold text-[#1C1C1C]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[#6B6B6B]">{message}</p>
      <Link
        href="/shop"
        className="mt-8 inline-flex rounded bg-[#800020] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
      >
        Back to Shop
      </Link>
    </div>
  );
}

export function StorefrontLoadingState({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
      <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#800020]/20" />
      <p className="mt-4 text-sm text-[#6B6B6B]">{label}</p>
    </div>
  );
}

export function StorefrontEmptyState({
  icon: Icon = ShoppingBag,
  title,
  message,
  actionLabel,
  actionHref,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <Icon className="mx-auto h-16 w-16 text-[#95271D]" />
      <h2 className="mt-4 font-serif text-xl font-semibold text-[#1C1C1C]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[#6B6B6B]">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-8 inline-flex rounded bg-[#800020] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PosterSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-[#800020] to-[#C41E3A] p-10 sm:p-14">
          <svg className="absolute -right-10 -top-10 h-48 w-48 text-white/5" viewBox="0 0 200 200" fill="none">
            <path d="M100 10l20 60h60l-50 35 20 60-50-35-50 35 20-60-50-35h60z" stroke="currentColor" strokeWidth="1" />
          </svg>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              New Season
            </p>
            <h3 className="mt-3 font-serif text-2xl font-bold text-white sm:text-3xl">
              Summer Collection &rsquo;26
            </h3>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Light, breathable fabrics crafted for the warm months ahead. Shop breezy silks and cottons.
            </p>
            <div className="mt-6">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-medium text-[#800020] hover:bg-[#FFF0E8] transition-colors"
              >
                Shop Summer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
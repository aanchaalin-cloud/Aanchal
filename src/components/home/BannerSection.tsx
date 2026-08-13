import Link from "next/link";
import Image from "next/image";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

export function BannerSection({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("banner", content);
  const imageUrl = c.imageUrl?.trim();

  return (
    <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={c.headline || "Aanchal banner"}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[#95271D]" />
      )}
      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            {c.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A843]/80">
                {c.eyebrow}
              </p>
            )}
            <h2 className="mt-4 text-4xl font-bold leading-tight text-[#D4A843] sm:text-5xl">
              {c.headline || "Where Every Thread Tells a Story"}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#D4A843]/70">
              {c.description ||
                "Premium Indian ethnic wear, custom tailored to your measurements — each piece carries the legacy of artisans who've perfected their craft over generations."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={c.ctaHref || "/shop"}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4A843] px-7 py-3 text-sm font-bold text-[#4d0010] shadow-lg transition-colors hover:bg-[#e2b958]"
              >
                {c.ctaLabel || "Discover Custom Fit"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

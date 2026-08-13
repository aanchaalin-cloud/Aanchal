import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";
import { getSectionIcon } from "@/lib/section-icons";

export function InfluencerSection({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("influencer", content);
  const perks = c.items?.length ? c.items : [];

  return (
    <section className="py-20" aria-label="Influencer program">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#800020] px-6 py-14 text-center shadow-lg sm:px-12 md:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-[#95271D]/50 via-transparent to-[#4d0010]/50" />
          <div className="relative z-10 mx-auto max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#D4A843]">
              <Megaphone className="h-3.5 w-3.5" />
              {c.badge || "Aanchal Influencers"}
            </p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
              {c.headline || "Join Aanchal’s Influencer Program"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#FFF8F3]/85">
              {c.description ||
                "Create content, share Aanchal with your audience, and earn rewards on every sale you drive."}
            </p>
            {perks.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {perks.map((perk, idx) => {
                  const Icon = getSectionIcon(perk.icon);
                  return (
                    <span
                      key={`${perk.text}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-[#FFF8F3]"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#D4A843]" />
                      {perk.text}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-9">
              <Link
                href={c.ctaHref || "/influencer"}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4A843] px-8 py-3.5 text-sm font-bold text-[#4d0010] shadow-lg transition-colors hover:bg-[#e2b958]"
              >
                {c.ctaLabel || "Join the Influencer Program"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

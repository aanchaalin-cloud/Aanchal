import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

export function PromoMarquee({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("promo-marquee", content);
  const messages = c.items?.length
    ? c.items.map((i) => i.text).filter((t): t is string => Boolean(t))
    : [
        "Custom-Fit, Tailored For You",
        "Unique Dresses, One Of A Kind",
        "Handcrafted By Master Artisans",
        "Premium Quality Fabrics",
        "Made With Love In India",
      ];

  if (messages.length === 0) return null;

  return (
    <div className="overflow-hidden bg-[#800020] py-3">
      <div className="marquee-track flex w-max items-center">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex items-center">
            {messages.map((msg, idx) => (
              <span
                key={`${copy}-${msg}-${idx}`}
                className="flex items-center gap-8 px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFF8F3] sm:text-sm"
              >
                {msg}
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4A843]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

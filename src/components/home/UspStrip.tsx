import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";
import { getSectionIcon } from "@/lib/section-icons";

export function UspStrip({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("usp-strip", content);
  const items = c.items?.length ? c.items : [{ text: "Custom Fit. Tailored for You." }];

  return (
    <section className="bg-[#800020]" aria-label="Why choose Aanchal">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2.5 px-4 py-4 text-center sm:flex-row sm:gap-10 sm:px-6 sm:py-3.5 lg:px-8">
        {items.map((item, idx) => {
          const Icon = getSectionIcon(item.icon);
          return (
            <p
              key={item.text ?? idx}
              className="flex items-center gap-2 text-sm font-medium text-[#FFF8F3]"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#D4A843]" />
              {item.text}
            </p>
          );
        })}
      </div>
    </section>
  );
}

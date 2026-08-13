import { Sparkles } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

export function AnnouncementBar({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("announcement-bar", content);
  const message = c.message?.trim() || "Grand Opening Offer — Flat 20% Off on your first order with code AANCHAL20";

  return (
    <div className="fixed inset-x-0 top-0 z-[55] bg-[#1C1C1C]">
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-center gap-2 px-4">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#D4A843]" />
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-[#FFF8F3]">
          {message.includes("AANCHAL20") ? (
            <>
              {message.split("AANCHAL20")[0]}
              <span className="font-bold text-[#D4A843]">AANCHAL20</span>
              {message.split("AANCHAL20").slice(1).join("AANCHAL20")}
            </>
          ) : (
            message
          )}
        </p>
      </div>
    </div>
  );
}

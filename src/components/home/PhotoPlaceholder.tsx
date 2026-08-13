import Image from "next/image";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

export function PhotoPlaceholder({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("photo-placeholder", content);
  const imageUrl = c.imageUrl?.trim() || "/anarkali.webp";

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-[90%]">
        <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-[#E5D5C5]/40">
          <Image
            src={imageUrl}
            alt="Featured Anarkali — Aanchal"
            fill
            className="object-cover"
            sizes="75vw"
          />
        </div>
      </div>
    </section>
  );
}

import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_SECTION_ORDER, type HomepageSectionContent } from "@/lib/homepage-sections";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { HeroSection } from "@/components/home/HeroSection";
import { UspStrip } from "@/components/home/UspStrip";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { BannerSection } from "@/components/home/BannerSection";
import { PhotoPlaceholder } from "@/components/home/PhotoPlaceholder";
import { PromoMarquee } from "@/components/home/PromoMarquee";
import { TrendingSection } from "@/components/home/TrendingSection";
import { InfluencerSection } from "@/components/home/InfluencerSection";
import { TextSlideshow } from "@/components/home/TextSlideshow";
import { ReviewsSection } from "@/components/home/ReviewsSection";

type SectionRecord = {
  section_key: string;
  content: HomepageSectionContent;
};

function renderSection(key: string, content?: HomepageSectionContent) {
  switch (key) {
    case "announcement-bar":
      return <AnnouncementBar content={content} />;
    case "hero":
      return <HeroSection content={content} />;
    case "usp-strip":
      return <UspStrip content={content} />;
    case "categories":
      return <CategoriesSection />;
    case "banner":
      return <BannerSection content={content} />;
    case "photo-placeholder":
      return <PhotoPlaceholder content={content} />;
    case "promo-marquee":
      return <PromoMarquee content={content} />;
    case "trending":
      return <TrendingSection />;
    case "influencer":
      return <InfluencerSection content={content} />;
    case "text-slideshow":
      return <TextSlideshow content={content} />;
    case "reviews":
      return <ReviewsSection content={content} />;
    default:
      return null;
  }
}

export async function HomepageSections() {
  let sections: SectionRecord[] | null = null;

  try {
    const supabase = await createServiceClient();
    // If the DB is slow, avoid blocking the entire homepage render.
    // Race the query against a short timeout and fall back to defaults if it takes too long.
    const QUERY_TIMEOUT_MS = 600;
    const queryPromise = supabase
      .from("homepage_sections")
      .select("section_key, content")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // Wrap the Postgrest builder in an async function so we get a true Promise
    const queryPromiseTyped = (async () => {
      const r = await queryPromise;
      return { data: (r as { data?: SectionRecord[] | null }).data ?? null };
    })();

    const timed = (await Promise.race([
      queryPromiseTyped,
      new Promise<{ data: SectionRecord[] | null }>((res) =>
        setTimeout(() => res({ data: null }), QUERY_TIMEOUT_MS)
      ),
    ])) as { data: SectionRecord[] | null } | null;

    sections = (timed?.data ?? []) as SectionRecord[];
  } catch {
    // DB unavailable or query failed — fall back to built-in defaults below.
    sections = null;
  }

  // Fallback: render the full homepage in default order when the table
  // is empty or unreachable, so the site never goes blank.
  const keys =
    sections && sections.length > 0
      ? sections.map((s) => s.section_key)
      : DEFAULT_SECTION_ORDER;

  return (
    <>
      {keys.map((key) => {
        const record = sections?.find((s) => s.section_key === key);
        return <div key={key} data-section={key}>{renderSection(key, record?.content)}</div>;
      })}
    </>
  );
}

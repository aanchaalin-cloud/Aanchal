// ============================================================
// Homepage section registry
// Shared by the storefront renderer and the admin manager.
// Each section type defines its defaults, editable content fields,
// and item-level fields used to build the admin edit form.
// ============================================================

export type SectionKey =
  | "announcement-bar"
  | "hero"
  | "usp-strip"
  | "categories"
  | "banner"
  | "photo-placeholder"
  | "promo-marquee"
  | "trending"
  | "influencer"
  | "text-slideshow"
  | "reviews";

export type SectionItem = {
  icon?: string | null;
  text?: string | null;
  name?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  actionLabel?: string | null;
  actionHref?: string | null;
  location?: string | null;
  rating?: number | null;
};

export type HomepageSectionContent = {
  eyebrow?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  badge?: string | null;
  message?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  items?: SectionItem[];
};

export type FieldType = "text" | "textarea" | "number" | "icon" | "image";

export type SectionFieldDef = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
};

export type SectionItemFieldDef = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

export type SectionDefinition = {
  key: SectionKey;
  label: string;
  description: string;
  hasContent: boolean;
  fields: SectionFieldDef[];
  itemsLabel?: string;
  itemAddLabel?: string;
  itemFields?: SectionItemFieldDef[];
  defaultContent: HomepageSectionContent;
};

const text = (name: string, label: string, placeholder?: string): SectionFieldDef => ({
  name,
  label,
  type: "text",
  placeholder,
});
const textarea = (name: string, label: string, placeholder?: string): SectionFieldDef => ({
  name,
  label,
  type: "textarea",
  placeholder,
});

const itemText = (name: string, label: string): SectionItemFieldDef => ({ name, label, type: "text" });
const itemTextarea = (name: string, label: string): SectionItemFieldDef => ({ name, label, type: "textarea" });

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "announcement-bar",
    label: "Announcement Bar",
    description: "Thin fixed bar at the very top of the homepage.",
    hasContent: true,
    fields: [text("message", "Announcement text", "Grand Opening Offer — code AANCHAL20")],
    defaultContent: {
      message: "Grand Opening Offer — Flat 20% Off on your first order with code AANCHAL20",
    },
  },
  {
    key: "hero",
    label: "Hero Banner",
    description: "Full-screen video banner with the brand name and call to action.",
    hasContent: true,
    fields: [
      text("eyebrow", "Eyebrow text", "Premium Indian Ethnic Wear"),
      text("headline", "Headline", "Premium Anarkali"),
      text("subheadline", "Sub-headline", "Custom Tailored for You"),
      textarea("description", "Description", "Order Today — handcrafted ethnic wear made to your measurements."),
      text("ctaLabel", "Button label", "Shop Now"),
      text("ctaHref", "Button link", "/shop"),
      { name: "videoUrl", label: "Background video URL", type: "image", placeholder: "/video1.mp4", help: "MP4 video path or URL." },
    ],
    defaultContent: {
      eyebrow: "Premium Indian Ethnic Wear",
      headline: "Premium Anarkali",
      subheadline: "Custom Tailored for You",
      description: "Order Today — handcrafted ethnic wear made to your measurements.",
      ctaLabel: "Shop Now",
      ctaHref: "/shop",
      videoUrl: "/video1.mp4",
    },
  },
  {
    key: "usp-strip",
    label: "USP Strip",
    description: "Row of short selling-point messages with icons.",
    hasContent: true,
    fields: [],
    itemsLabel: "Messages",
    itemAddLabel: "Add message",
    itemFields: [
      { name: "icon", label: "Icon", type: "icon" },
      itemText("text", "Message"),
    ],
    defaultContent: {
      items: [
        { icon: "Ruler", text: "Custom Fit. Tailored for You." },
        { icon: "Scissors", text: "Made to Measure Ethnic Wear" },
        { icon: "Sparkles", text: "Custom Tailoring on Every Order" },
      ],
    },
  },
  {
    key: "categories",
    label: "Categories",
    description: "Product categories pulled automatically from the catalog.",
    hasContent: false,
    fields: [],
    defaultContent: {},
  },
  {
    key: "banner",
    label: "Brand Banner",
    description: "Large brand story banner with optional background image.",
    hasContent: true,
    fields: [
      text("eyebrow", "Eyebrow text", "Crafted with Love"),
      text("headline", "Headline", "Where Every Thread Tells a Story"),
      textarea("description", "Description", "Brand story paragraph…"),
      text("ctaLabel", "Button label", "Discover Custom Fit"),
      text("ctaHref", "Button link", "/shop"),
      { name: "imageUrl", label: "Background image URL (optional)", type: "image", placeholder: "https://…" },
    ],
    defaultContent: {
      eyebrow: "Crafted with Love",
      headline: "Where Every Thread Tells a Story",
      description:
        "Premium Indian ethnic wear, custom tailored to your measurements — each piece carries the legacy of artisans who’ve perfected their craft over generations.",
      ctaLabel: "Discover Custom Fit",
      ctaHref: "/shop",
    },
  },
  {
    key: "photo-placeholder",
    label: "Featured Image",
    description: "Wide editorial image between sections.",
    hasContent: true,
    fields: [{ name: "imageUrl", label: "Image URL", type: "image", placeholder: "/anarkali.webp" }],
    defaultContent: { imageUrl: "/anarkali.webp" },
  },
  {
    key: "promo-marquee",
    label: "Promo Marquee",
    description: "Scrolling text strip of short promo phrases.",
    hasContent: true,
    fields: [],
    itemsLabel: "Phrases",
    itemAddLabel: "Add phrase",
    itemFields: [itemText("text", "Phrase")],
    defaultContent: {
      items: [
        { text: "Custom-Fit, Tailored For You" },
        { text: "Unique Dresses, One Of A Kind" },
        { text: "Handcrafted By Master Artisans" },
        { text: "Premium Quality Fabrics" },
        { text: "Made With Love In India" },
      ],
    },
  },
  {
    key: "trending",
    label: "Trending Products",
    description: "Featured products pulled automatically from the catalog.",
    hasContent: false,
    fields: [],
    defaultContent: {},
  },
  {
    key: "influencer",
    label: "Influencer Program",
    description: "Influencer recruitment banner.",
    hasContent: true,
    fields: [
      text("badge", "Badge", "Aanchal Influencers"),
      text("headline", "Headline", "Join Aanchal’s Influencer Program"),
      textarea("description", "Description", "Program pitch…"),
      text("ctaLabel", "Button label", "Join the Influencer Program"),
      text("ctaHref", "Button link", "/influencer"),
    ],
    itemsLabel: "Perks",
    itemAddLabel: "Add perk",
    itemFields: [
      { name: "icon", label: "Icon", type: "icon" },
      itemText("text", "Perk text"),
    ],
    defaultContent: {
      badge: "Aanchal Influencers",
      headline: "Join Aanchal’s Influencer Program",
      description:
        "Create content, share Aanchal with your audience, and earn rewards on every sale you drive.",
      items: [
        { icon: "Gift", text: "Earn rewards on every sale" },
        { icon: "Users", text: "Grow your audience with Aanchal" },
        { icon: "Megaphone", text: "Share premium ethnic wear" },
      ],
      ctaLabel: "Join the Influencer Program",
      ctaHref: "/influencer",
    },
  },
  {
    key: "text-slideshow",
    label: "Text Slideshow",
    description: "Rotating informational slides with icons and links.",
    hasContent: true,
    fields: [],
    itemsLabel: "Slides",
    itemAddLabel: "Add slide",
    itemFields: [
      { name: "icon", label: "Icon", type: "icon" },
      itemText("title", "Title"),
      itemText("subtitle", "Subtitle"),
      itemTextarea("description", "Description"),
      itemText("actionLabel", "Button label"),
      itemText("actionHref", "Button link"),
    ],
    defaultContent: {
      items: [
        {
          icon: "Bell",
          title: "Get Notified",
          subtitle: "Be the first to know about new drops",
          description:
            "Sign up for exclusive updates on our latest collections, restocks, and special offers delivered straight to your inbox.",
          actionLabel: "Subscribe",
          actionHref: "/contact",
        },
        {
          icon: "Instagram",
          title: "Follow Us",
          subtitle: "Join the Aanchal community",
          description:
            "Follow us on Instagram for behind-the-scenes content, styling inspiration, and a closer look at the craftsmanship behind every piece.",
          actionLabel: "Follow @aanchal",
          actionHref: "#",
        },
        {
          icon: "Mail",
          title: "Contact Us",
          subtitle: "We’d love to hear from you",
          description:
            "Have a question about sizing, shipping, or custom orders? Our team is here to help you find the perfect piece.",
          actionLabel: "Get in Touch",
          actionHref: "/contact",
        },
      ],
    },
  },
  {
    key: "reviews",
    label: "Customer Reviews",
    description: "Rotating customer testimonials.",
    hasContent: true,
    fields: [
      text("eyebrow", "Eyebrow text", "Testimonials"),
      text("headline", "Headline", "What Our Customers Say"),
    ],
    itemsLabel: "Reviews",
    itemAddLabel: "Add review",
    itemFields: [
      itemText("name", "Name"),
      itemText("location", "Location"),
      { name: "rating", label: "Rating (1–5)", type: "number" },
      itemTextarea("text", "Review"),
    ],
    defaultContent: {
      eyebrow: "Testimonials",
      headline: "What Our Customers Say",
      items: [],
    },
  },
];

const SECTION_BY_KEY = new Map<SectionKey, SectionDefinition>(
  SECTION_DEFINITIONS.map((def) => [def.key, def])
);

export function getSectionDefinition(key: string): SectionDefinition | undefined {
  return SECTION_BY_KEY.get(key as SectionKey);
}

/** Default render order (also used as fallback when the DB is unavailable). */
export const DEFAULT_SECTION_ORDER: SectionKey[] = SECTION_DEFINITIONS.map((def) => def.key);

/** Merge stored content over the type defaults so missing fields fall back gracefully. */
export function getSectionContent(key: string, content?: HomepageSectionContent): HomepageSectionContent {
  const defaults = getSectionDefinition(key)?.defaultContent ?? {};
  const merged = { ...defaults, ...(content ?? {}) };
  if (content?.items) merged.items = content.items;
  return merged;
}

/** All section types that are not currently used — for the "add section" picker. */
export function getAvailableSectionKeys(usedKeys: string[]): SectionDefinition[] {
  return SECTION_DEFINITIONS.filter((def) => !usedKeys.includes(def.key));
}

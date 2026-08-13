import type { Metadata } from "next";
import Link from "next/link";
import {
  Megaphone,
  Gift,
  Users,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Shirt,
  Eye,
  Package,
  Flame,
  Video,
  Camera,
  Heart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Influencer & Creator Program",
  description:
    "Join the Aanchal Creator & Dancer Squad. Get free outfits, earn commissions on sales, and get featured on our official channels.",
  alternates: {
    canonical: "/influencer",
  },
};

const PERKS = [
  {
    icon: Shirt,
    title: "Free Outfit OR 50% OFF",
    description:
      "Selected creators get free dresses or an instant 50% Flat Discount Coupon on any outfit of their choice.",
  },
  {
    icon: IndianRupee,
    title: "Earn Commission on Ads & Sales",
    description:
      "Jab aapki reel humare Ad campaigns mein chalegi ya aapke custom link/code se orders aayenge, toh aapko fixed commission milega.",
  },
  {
    icon: Eye,
    title: "Brand Exposure",
    description:
      "Aapki reels aur videos humare official Instagram, Ads, aur Website par feature hongi — reach unlimited!",
  },
  {
    icon: Package,
    title: "Early Access",
    description:
      "Humare new collections aur capsule launches sabse pehle aapke paas pahunchege.",
  },
];

const STEPS = [
  {
    icon: Users,
    title: "Apply Below",
    description:
      "Form fill karein aur batayein ki aap Dancer hain ya Fashion/Lifestyle Influencer.",
  },
  {
    icon: Gift,
    title: "Get Approved & Claim Offer",
    description:
      "Shortlist hone par humari team aapko connect karegi aur aapka 50% OFF Coupon ya Free Outfit dispatch karegi.",
  },
  {
    icon: IndianRupee,
    title: "Create & Start Earning",
    description:
      "Outfit pehn kar reel / dance content banayein, hume tag karein, aur Ads & sales par regular payouts paayein!",
  },
];

const WHO_CAN_JOIN = [
  {
    icon: Video,
    title: "Dancers & Choreographers",
    description:
      "High-energy reels, transition videos, ya choreography content banane waale.",
  },
  {
    icon: Camera,
    title: "Fashion & Lifestyle Creators",
    description:
      "OOTD, GRWM, styling guides, ya aesthetic vertical videos banane waale.",
  },
];

export default function InfluencerPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <section className="rounded-sm bg-[#95271D] p-8 text-white sm:p-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Flame className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Aanchal Creator & Dancer Squad
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              Join Our Creator & Dancer Squad!
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
              Are you a Dancer, Choreographer, Fashion Influencer, or Content
              Creator? Let&apos;s Collab! Hum dhoond rahe hain passionate Dancers
              aur Style Creators jo humare outfits ko apni reel moves aur content
              ke saath slay kar sakein.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
            <Megaphone className="h-3.5 w-3.5 text-[#F5C518]" />
            Free to join
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#F5C518]" />
            No minimum followers
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
            <IndianRupee className="h-3.5 w-3.5 text-[#F5C518]" />
            Earn on every sale
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
            <Heart className="h-3.5 w-3.5 text-[#F5C518]" />
            Free outfit OR 50% OFF
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/influencer/apply"
            className="inline-flex items-center justify-center gap-2 rounded bg-white px-6 py-3 text-sm font-semibold text-[#95271D] hover:bg-[#FFF0E8] transition-colors"
          >
            Apply Now
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded border border-white/40 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Browse the Collection
          </Link>
        </div>
      </section>

      {/* Perks & Benefits */}
      <section className="mt-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            Perks & Benefits
          </p>
          <h2 className="mt-2 font-display text-3xl text-[#1C1C1C]">
            What&apos;s In It For You?
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="rounded-sm border border-[#E5D5C5]/60 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#95271D]/10">
                <perk.icon className="h-5 w-5 text-[#95271D]" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1C1C1C]">
                {perk.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
                {perk.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            How It Works
          </p>
          <h2 className="mt-2 font-display text-3xl text-[#1C1C1C]">
            3 Simple Steps
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, idx) => (
            <div
              key={step.title}
              className="relative rounded-sm border border-[#E5D5C5]/60 bg-white p-6"
            >
              <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-[#95271D] text-xs font-bold text-white">
                {idx + 1}
              </span>
              <step.icon className="h-7 w-7 text-[#95271D]" />
              <h3 className="mt-4 text-base font-semibold text-[#1C1C1C]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Who can join */}
      <section className="mt-16 rounded-sm border border-[#E5D5C5]/60 bg-white p-8 sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            Who Can Join?
          </p>
          <h2 className="mt-2 font-display text-2xl text-[#1C1C1C]">
            Creators, Dancers & Everyone In Between
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-sm text-[#6B6B6B] leading-relaxed">
            No strictly big follower count needed! Hum followers se zyada aapke
            content ki quality, camera confidence, aur vibe ko prioritize karte
            hain.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WHO_CAN_JOIN.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-sm border border-[#E5D5C5]/40 bg-[#FFF8F3] p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#95271D]/10">
                <item.icon className="h-5 w-5 text-[#95271D]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1C1C1C]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="font-display text-2xl text-[#1C1C1C]">
          Ready to Slay with Aanchal?
        </h2>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Style dikhao, dance karo, aur paayein exclusive gifts aur payouts!
        </p>
        <Link
          href="/influencer/apply"
          className="mt-6 inline-flex items-center gap-2 rounded bg-[#95271D] px-8 py-3 text-sm font-semibold text-white hover:bg-[#7A1F17] transition-colors"
        >
          Apply Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

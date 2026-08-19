import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const applySchema = z.object({
  full_name: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required").max(15),
  social_handle: z.string().min(1, "Social handle is required").max(100),
  social_link: z.string().url("Please enter a valid URL").max(500),
  platform: z.enum(["Instagram", "YouTube", "Facebook", "TikTok", "X (Twitter)", "Other"], {
    errorMap: () => ({ message: "Please select a platform" }),
  }),
  followers: z.string().max(50).optional().or(z.literal("")),
  niche: z.string().min(1, "Please select a niche").max(100),
  desired_promo_code: z.string().max(50).optional().or(z.literal("")),
  bio: z.string().min(20, "Tell us a little more about yourself (min 20 characters)").max(1000),
});

function verifySocialLink(url: string, platform: string): { ok: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    const platformDomains: Record<string, string[]> = {
      Instagram: ["instagram.com"],
      YouTube: ["youtube.com", "youtu.be"],
      Facebook: ["facebook.com", "fb.com"],
      TikTok: ["tiktok.com"],
      "X (Twitter)": ["twitter.com", "x.com"],
    };

    const allowed = platformDomains[platform];
    if (allowed && !allowed.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { ok: false, error: `Link doesn't match ${platform}. Please check the URL.` };
    }

    if (platform === "Instagram" && !parsed.pathname.match(/^\/[^\/]+\/?$/)) {
      return { ok: false, error: "Please enter your Instagram profile link (e.g. instagram.com/yourhandle)" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Please enter a valid URL starting with https://" };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, applySchema);
  if (body instanceof NextResponse) return body;

  const linkCheck = verifySocialLink(body.social_link, body.platform);
  if (!linkCheck.ok) {
    return NextResponse.json({ success: false, error: linkCheck.error }, { status: 400 });
  }

  try {
    const service = await createServiceClient();

    const { error } = await service.from("influencer_applications").insert({
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      social_handle: body.social_handle,
      social_link: body.social_link,
      platform: body.platform,
      followers: body.followers || null,
      niche: body.niche,
      desired_promo_code: body.desired_promo_code || null,
      bio: body.bio,
    });

    if (error) {
      console.error("[influencers/apply] Insert error:", error.message);
      return NextResponse.json(
        { success: false, error: "Unable to submit your application. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[influencers/apply] Unhandled error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

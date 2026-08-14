-- ============================================================
-- Phase 18: Homepage sections (admin-managed homepage CMS)
-- ============================================================
-- homepage_sections: each row is one homepage section. `content`
-- is a JSON blob of the editable text/images for that section type.
-- The storefront reads active sections ordered by sort_order and
-- renders them through the section renderer; when the table is
-- empty (or the migration hasn't been applied), the renderer falls
-- back to the built-in component defaults so the homepage always
-- renders.
-- ============================================================

begin;

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_sections_active_sort_idx
  on public.homepage_sections (is_active asc, sort_order asc);

drop trigger if exists homepage_sections_set_updated_at; create trigger homepage_sections_set_updated_at
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Seeds: match the current hardcoded homepage so the site looks
-- identical out of the box. No-op when the table already has rows.
-- ------------------------------------------------------------------
insert into public.homepage_sections (section_key, title, is_active, sort_order, content)
select * from (values
  (
    'announcement-bar',
    'Announcement Bar',
    true,
    10,
    '{"message":"Grand Opening Offer — Flat 20% Off on your first order with code AANCHAL20"}'::jsonb
  ),
  (
    'hero',
    'Hero Banner',
    true,
    20,
    '{
      "eyebrow":"Premium Indian Ethnic Wear",
      "headline":"Premium Exotic Anarkali",
      "subheadline":"Custom Tailored for You",
      "description":"Order Today — handcrafted ethnic wear made to your measurements.",
      "ctaLabel":"Shop Now",
      "ctaHref":"/shop",
      "videoUrl":"/Video1.mp4"
    }'::jsonb
  ),
  (
    'usp-strip',
    'USP Strip',
    true,
    30,
    '{
      "items":[
        {"icon":"Ruler","text":"Custom Fit. Tailored for You."},
        {"icon":"Scissors","text":"Made to Measure Ethnic Wear"},
        {"icon":"Sparkles","text":"Custom Tailoring on Every Order"}
      ]
    }'::jsonb
  ),
  (
    'categories',
    'Categories',
    true,
    40,
    '{}'::jsonb
  ),
  (
    'banner',
    'Brand Banner',
    true,
    50,
    '{
      "eyebrow":"Crafted with Love",
      "headline":"Where Every Thread Tells a Story",
      "description":"Premium Indian ethnic wear, custom tailored to your measurements — each piece carries the legacy of artisans who’ve perfected their craft over generations.",
      "ctaLabel":"Discover Custom Fit",
      "ctaHref":"/shop"
    }'::jsonb
  ),
  (
    'photo-placeholder',
    'Featured Image',
    true,
    60,
    '{"imageUrl":"/anarkali.webp"}'::jsonb
  ),
  (
    'promo-marquee',
    'Promo Marquee',
    true,
    70,
    '{
      "items":[
        {"text":"Custom-Fit, Tailored For You"},
        {"text":"Unique Dresses, One Of A Kind"},
        {"text":"Handcrafted By Master Artisans"},
        {"text":"Premium Quality Fabrics"},
        {"text":"Made With Love In India"}
      ]
    }'::jsonb
  ),
  (
    'trending',
    'Trending Products',
    true,
    80,
    '{}'::jsonb
  ),
  (
    'influencer',
    'Influencer Program',
    true,
    90,
    '{
      "badge":"Aanchal Influencers",
      "headline":"Join Aanchal’s Influencer Program",
      "description":"Create content, share Aanchal with your audience, and earn rewards on every sale you drive.",
      "items":[
        {"icon":"Gift","text":"Earn rewards on every sale"},
        {"icon":"Users","text":"Grow your audience with Aanchal"},
        {"icon":"Megaphone","text":"Share premium ethnic wear"}
      ],
      "ctaLabel":"Join the Influencer Program",
      "ctaHref":"/influencer"
    }'::jsonb
  ),
  (
    'text-slideshow',
    'Text Slideshow',
    true,
    100,
    '{
      "items":[
        {
          "icon":"Bell",
          "title":"Get Notified",
          "subtitle":"Be the first to know about new drops",
          "description":"Sign up for exclusive updates on our latest collections, restocks, and special offers delivered straight to your inbox.",
          "actionLabel":"Subscribe",
          "actionHref":"/contact"
        },
        {
          "icon":"Instagram",
          "title":"Follow Us",
          "subtitle":"Join the Aanchal community",
          "description":"Follow us on Instagram for behind-the-scenes content, styling inspiration, and a closer look at the craftsmanship behind every piece.",
          "actionLabel":"Follow @aanchal",
          "actionHref":"#"
        },
        {
          "icon":"Mail",
          "title":"Contact Us",
          "subtitle":"We’d love to hear from you",
          "description":"Have a question about sizing, shipping, or custom orders? Our team is here to help you find the perfect piece.",
          "actionLabel":"Get in Touch",
          "actionHref":"/contact"
        }
      ]
    }'::jsonb
  ),
  (
    'reviews',
    'Customer Reviews',
    true,
    110,
    '{
      "eyebrow":"Testimonials",
      "headline":"What Our Customers Say",
      "items":[
        {"name":"Priya S.","location":"Mumbai","rating":5,"text":"Absolutely in love with my silk saree! The quality is exceptional and the craftsmanship is evident in every detail. Received so many compliments at the wedding."},
        {"name":"Anita K.","location":"Delhi","rating":5,"text":"The fit of the kurta set is perfect. I appreciate how the brand blends traditional aesthetics with modern silhouettes. Fast shipping and beautiful packaging too!"},
        {"name":"Rohini M.","location":"Bangalore","rating":5,"text":"Ordered the fusion wear set for a family function and it was a hit. The fabric is comfortable, the colors are rich, and the embroidery is stunning."},
        {"name":"Meera J.","location":"Pune","rating":5,"text":"Aanchal has become my go-to for ethnic wear. The attention to detail, the quality of fabric, and the customer service are all outstanding."},
        {"name":"Deepa R.","location":"Chennai","rating":5,"text":"The custom fit option is a game changer. I finally have a lehenga that fits perfectly without alterations. The personalisation request was handled beautifully."},
        {"name":"Kavitha N.","location":"Hyderabad","rating":5,"text":"Bought the Anarkali set for my sister’s engagement. Everyone thought it was designer! The gold thread work is exquisite and the fabric drapes like a dream."},
        {"name":"Shreya P.","location":"Kolkata","rating":5,"text":"I was nervous ordering online but the measurements form was so easy to follow. The dress fits like it was made for me — because it literally was! Will order again."},
        {"name":"Nandini V.","location":"Jaipur","rating":5,"text":"The Bandhani print kurta is stunning. Rich colours, comfortable cotton, and the handloom feel is authentic. Aanchal truly honours Indian textile traditions."},
        {"name":"Fatima Z.","location":"Lucknow","rating":5,"text":"Beautiful chikankari work on the white kurta set. I wore it to an Eid gathering and received endless compliments. The packaging was lovely too — felt like unwrapping a gift."},
        {"name":"Lakshmi T.","location":"Coimbatore","rating":5,"text":"Third order from Aanchal and they never disappoint. The consistency in quality is what keeps me coming back. My mother loves their cotton sarees."}
      ]
    }'::jsonb
  )
) as seed(section_key, title, is_active, sort_order, content)
on conflict (section_key) do nothing;

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
alter table public.homepage_sections enable row level security;

-- Anyone can read homepage sections (marketing content).
drop policy if exists homepage_sections_read_all; create policy homepage_sections_read_all
  on public.homepage_sections for select
  using (true);

-- Admins can manage sections (API layer also enforces requireAdmin()).
drop policy if exists homepage_sections_admin_all; create policy homepage_sections_admin_all
  on public.homepage_sections for all
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Privileges
-- ------------------------------------------------------------------
revoke all on table public.homepage_sections from anon, authenticated;

grant select on table public.homepage_sections to anon, authenticated;
grant insert, update, delete on table public.homepage_sections to authenticated;

commit;

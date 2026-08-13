# Aanchal — Premium Indian Ethnic Wear

A production-ready e-commerce storefront for **Aanchal**, a premium Indian ethnic-wear brand (custom-tailored anarkalis and more), built with **Next.js 15** (App Router), **Supabase**, and a dual **Paytm + Razorpay** payment setup.

---

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS 4** (custom design system)
- **Supabase** — PostgreSQL + Auth + Storage, RLS everywhere
- **Paytm** (primary) + **Razorpay** (fallback) payment gateways
- **Shiprocket** courier integration (admin order shipping)
- **Zod** API input validation, **Lucide React** icons
- Deploy target: **Vercel**

---

## Features

### Customer
- Mobile-first storefront with hero video, marquee collections, trending products
- Product catalog (`/shop`) with category + filter search
- Product detail pages with size/color selection, images, and reviews (`/products/[slug]`)
- Cart with localStorage persistence + slide-out cart drawer
- Secure checkout (Paytm / Razorpay prepaid, or COD with half-prepay)
- Order confirmation + order tracking (`/track-order`) with signed status tokens
- Wishlist, customer account (orders, addresses, profile), login/signup/reset password
- Rewards program with vouchers, influencer program + referral discounts
- Contact page, shipping / return / privacy / terms policies

### Admin (`/admin`, auth + role protected)
- Dashboard with stats, recent orders, low-stock alerts
- Product CRUD with multiple images, variants (size/color/SKU/stock)
- Order management, status updates, shipment creation (Shiprocket)
- Coupons, categories, reviews moderation, rewards vouchers, influencers, team
- Homepage section content management

### Loyalty & Marketing
- Rewards vouchers earned on orders; redeemable at checkout
- Influencer program: apply, get a personal code, earn commission discount on referred orders

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project — [supabase.com](https://supabase.com)
- A Paytm merchant account (or Razorpay as fallback)
- A Vercel account for deployment — [vercel.com](https://vercel.com)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

The required minimum set:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ORDER_STATUS_TOKEN_SECRET=your-long-random-secret
```

Payments — set `PAYTM_MID` + `PAYTM_MERCHANT_KEY` to make Paytm the checkout gateway; otherwise Razorpay is used:
```env
PAYTM_MID=YOUR_MERCHANT_ID
PAYTM_MERCHANT_KEY=YOUR_MERCHANT_KEY
PAYTM_WEBSITE_NAME=WEBSTAGING
# PAYTM_ENV=production
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

App:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Aanchal
NEXT_PUBLIC_WHATSAPP_NUMBER=+918949911242
```

Shipping (optional — enables "Create Shipment" on admin orders):
```env
# SHIPPING_PROVIDER=shiprocket
# SHIPROCKET_EMAIL=YOUR_SHIPROCKET_LOGIN_EMAIL
# SHIPROCKET_PASSWORD=YOUR_SHIPROCKET_LOGIN_PASSWORD
```

### 3. Apply the database migrations
The full schema is maintained as versioned SQL migrations in `supabase/migrations/` (14 files, `20260804...` → `20260812...`). Apply them in order:

**Via Supabase CLI** (recommended):
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

**Or manually**: open each file in the Supabase **SQL Editor** and run it in order. Migrations create all tables, RLS policies, triggers, and storage policies for the `product-images` bucket.

### 4. Create your admin user
1. Supabase → **Authentication → Users** → add a user with your admin email/password.
2. Copy the user's UUID and insert into `admin_users` (Super Admin should set `role = 'superadmin'`):
```sql
INSERT INTO admin_users (id, email, role)
VALUES ('paste-user-uuid-here', 'admin@aanchal.in', 'superadmin');
```

### 5. Create the storage bucket
Supabase → **Storage** → new bucket `product-images`, public. Image uploads from the admin panel use this bucket.

### 6. Run the dev server
```bash
npm run dev
```

- **Storefront**: http://localhost:3000
- **Admin**: http://localhost:3000/admin/login

---

## Test Payments

- **Paytm staging**: keep `PAYTM_ENV` unset (defaults to `https://securegw-stage.paytm.in`). Use the Paytm staging sandbox test card details.
- **Razorpay test mode**: card `4111 1111 1111 1111`, any future expiry, any CVV; or UPI `success@razorpay`.

---

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import it in Vercel (framework: Next.js).
3. Add **all** variables from `.env.example` to the project's environment settings.
4. Deploy.

**Before going live:**
- Set `PAYTM_ENV=production` (and `PAYTM_GATEWAY_BASE_URL=https://securegw.paytm.in`) and use live Paytm credentials; or switch to live Razorpay keys.
- Set `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_APP_URL` to your production domain.
- Apply the latest migrations to your production Supabase project.
- Configure the Supabase Auth redirect URL for your production domain.
- Point the **Razorpay webhook** to `/api/webhook/razorpay` and the **Paytm callback** to `/api/webhook/paytm` (both are server-side verified).

---

## Project Structure

```
├── supabase/
│   └── migrations/            # Versioned SQL migrations (schema + RLS + storage)
├── public/                    # Static assets (video, webp, fonts, og image)
├── src/
│   ├── app/
│   │   ├── (storefront)/      # Home, shop, products, cart, checkout, policies…
│   │   ├── admin/             # Admin login + protected admin panels
│   │   └── api/               # Route handlers (checkout, webhooks, admin, auth…)
│   ├── components/
│   │   ├── layout/            # Header, Footer, StorefrontLayout
│   │   ├── product/           # ProductCard, ProductDetail, WishlistButton…
│   │   ├── home/              # Hero, Categories, Trending, PhotoPlaceholder…
│   │   ├── admin/             # Admin nav + panels
│   │   └── ui/                # Reusable primitives
│   ├── context/               # Cart, Auth, Wishlist providers
│   ├── lib/
│   │   ├── supabase/          # Browser/server clients + middleware session
│   │   ├── paytm/             # Paytm gateway client (checksums, verify)
│   │   ├── payments*.ts       # Gateway adapters (paytm/razorpay)
│   │   ├── shipping/          # Shiprocket integration
│   │   ├── queries/           # Data access layer
│   │   ├── validations.ts     # Zod schemas
│   │   └── api-utils.ts       # Rate limiting, admin guards, origin check
│   ├── middleware.ts          # Session refresh + admin route protection
│   └── types/                 # Shared TypeScript types
├── .env.example               # Documented environment template
└── package.json
```

---

## Security Architecture

| Threat | Mitigation |
|---|---|
| Price tampering | Server recalculates prices from DB (never trusts browser totals) |
| Out-of-stock purchase | Server validates stock before creating the payment order |
| Fake payment success | Paytm: `transactionStatus` API + amount match; Razorpay: HMAC signature + amount match |
| Duplicate payment processing | `finalizePaidOrder` is idempotent (checks `payment_status`) |
| Stock reduced before payment | Stock is reduced only after server-side verification succeeds |
| Public reads/modifies admin data | RLS on every table; admin-only policies |
| Unauthorized admin access | Middleware + protected layout verify the `admin_users` table server-side; every `/api/admin/*` route calls `requireAdmin`/`requireSuperAdmin` |
| CSRF | Origin check in `validateRequest` + security headers |
| Abuse / brute force | In-memory per-IP rate limiter on API mutations |
| Secret leakage | Service role key, Paytm merchant key, Razorpay secret live only in server-side env vars — never `NEXT_PUBLIC_` |
| XSS | React escaping + `Content-Security-Policy` header |
| Order status token forgery | HMAC-signed tokens (`ORDER_STATUS_TOKEN_SECRET`) |

### Environment variable safety
- Anything prefixed `NEXT_PUBLIC_` is public by design.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `PAYTM_MERCHANT_KEY`, `RAZORPAY_KEY_SECRET`, `ORDER_STATUS_TOKEN_SECRET`, Shiprocket credentials) are server-only and never inlined into client bundles.

---

## Development Scripts

```bash
npm run dev         # Development server
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint
npm run type-check  # TypeScript (tsc --noEmit)
```

---

## Support

- Issues? Check the Supabase and Vercel logs first.
- Payments: [paytm.com/docs](https://developer.paytm.com) · [razorpay.com/docs](https://razorpay.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)

**Made with care for Indian craftsmanship 🇮🇳**

# Vastra — Indian Clothing Brand E-Commerce MVP

A production-ready, secure e-commerce MVP for a small Indian clothing brand, built with **Next.js App Router**, **Supabase**, and **Razorpay**.

> Designed to be clean, maintainable, secure, and premium — not overbuilt.

---

## 🏗️ Tech Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS 4** (custom design system)
- **Supabase** PostgreSQL + Auth + Storage
- **Razorpay** payment gateway
- **Zod** for API input validation
- **Lucide React** for icons
- **Vercel** for deployment

---

## 📋 Features

### Customer
- ✅ Premium, mobile-first homepage with hero, features, featured products
- ✅ Product catalog (`/shop`)
- ✅ Product detail pages with size & color selection (`/products/[slug]`)
- ✅ Cart with localStorage persistence
- ✅ Slide-out cart drawer + full cart page
- ✅ Secure checkout with Razorpay payment
- ✅ Order confirmation page
- ✅ About, Contact, FAQ
- ✅ Shipping / Return / Privacy / Terms policy pages
- ✅ 404 + error handling

### Admin
- ✅ Secure login via Supabase Auth
- ✅ Dashboard with stats, recent orders, low-stock alerts
- ✅ Product CRUD (create, edit, hide, delete)
- ✅ Multiple image URLs per product
- ✅ Variants with size / color / hex / SKU / stock
- ✅ Order list + detail with customer & address
- ✅ Order status updater (pending → paid → shipped → delivered)
- ✅ Razorpay order ID + payment ID displayed for reference

### Security
- ✅ Row Level Security on every Supabase table
- ✅ Service role key used only in API routes (never client)
- ✅ Razorpay secret kept on server only
- ✅ Server-side price calculation (never trusts browser)
- ✅ Server-side stock validation before payment
- ✅ HMAC signature verification before marking paid
- ✅ Stock reduction only after verified payment
- ✅ Idempotent payment verification (prevents duplicates)
- ✅ Zod validation on all API inputs
- ✅ Server-side admin auth in middleware + layout
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- A Supabase project — [supabase.com](https://supabase.com)
- A Razorpay account — [razorpay.com](https://razorpay.com)
- A Vercel account (for deployment) — [vercel.com](https://vercel.com)

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up Supabase database
1. Open your Supabase project → **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Run the entire script

This creates:
- 6 tables (products, product_images, product_variants, orders, order_items, admin_users)
- All RLS policies
- Indexes for performance
- Triggers for `updated_at`
- Storage policies for `product-images` bucket

### 5. Create your admin user
1. Go to **Authentication → Users** in Supabase
2. Click **Add User → Create new user**
3. Enter your admin email + password
4. Copy the user's UUID
5. Run this SQL in the SQL Editor (replace with your values):
```sql
INSERT INTO admin_users (id, email)
VALUES ('paste-user-uuid-here', 'admin@yourbrand.com');
```

### 6. Create the storage bucket
1. Go to **Storage** in Supabase
2. Click **New bucket** → Name: `product-images`, Public: ✅
3. The RLS policies from `schema.sql` will automatically apply

### 7. Run the dev server
```bash
npm run dev
```

Visit:
- **Storefront**: http://localhost:3000
- **Admin**: http://localhost:3000/admin/login

---

## 🧪 Test Payment (Razorpay Test Mode)

Use Razorpay test card:
- **Card**: `4111 1111 1111 1111`
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **Name**: Any name

Or test UPI: `success@razorpay`

---

## 🌐 Deploy to Vercel

1. Push your project to GitHub
2. Import in Vercel
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Deploy

**Important**: Use Razorpay **live keys** in production env vars. Switch `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to live values.

---

## 📁 Project Structure

```
src/nextjs-project/
├── supabase/
│   └── schema.sql                  # Complete DB schema + RLS + storage policies
├── src/
│   ├── types/index.ts              # All TypeScript types
│   ├── lib/
│   │   ├── validations.ts          # Zod schemas
│   │   ├── utils.ts                # Helper functions
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client
│   │   │   ├── server.ts           # Server client (anon + service role)
│   │   │   └── middleware.ts       # Session refresh + admin protection
│   │   └── queries/
│   │       ├── products.ts         # Product queries
│   │       └── orders.ts           # Order queries (admin only)
│   ├── context/
│   │   └── CartContext.tsx         # Cart state + localStorage
│   ├── components/
│   │   ├── ui/                     # Button, Badge
│   │   ├── layout/                 # Navbar, Footer, StorefrontLayout
│   │   ├── product/                # ProductCard, ProductDetail
│   │   ├── cart/                   # CartDrawer
│   │   └── admin/                  # AdminNav, ProductForm, OrderStatusUpdater
│   ├── middleware.ts               # Next.js middleware
│   └── app/
│       ├── layout.tsx              # Root layout
│       ├── globals.css             # Tailwind + design tokens
│       ├── not-found.tsx           # 404
│       ├── loading.tsx             # Loading state
│       ├── global-error.tsx        # Global error boundary
│       ├── (storefront)/           # Public-facing pages
│       │   ├── layout.tsx
│       │   ├── page.tsx                          # /
│       │   ├── shop/page.tsx                     # /shop
│       │   ├── products/[slug]/page.tsx          # /products/[slug]
│       │   ├── cart/page.tsx                     # /cart
│       │   ├── checkout/page.tsx                 # /checkout
│       │   ├── order-success/page.tsx            # /order-success
│       │   ├── about/page.tsx                    # /about
│       │   ├── contact/page.tsx                  # /contact
│       │   ├── shipping-policy/page.tsx          # /shipping-policy
│       │   ├── return-policy/page.tsx            # /return-policy
│       │   ├── privacy-policy/page.tsx           # /privacy-policy
│       │   └── terms/page.tsx                    # /terms
│       ├── admin/                    # Protected admin
│       │   ├── login/page.tsx
│       │   ├── layout.tsx           # Server-side auth check
│       │   ├── page.tsx             # Dashboard
│       │   ├── products/...
│       │   └── orders/...
│       └── api/
│           └── checkout/
│               ├── create-order/route.ts   # Create Razorpay order
│               └── verify-payment/route.ts # Verify + update stock
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
└── .gitignore
```

---

## 🔒 Security Architecture

### Threat Model & Mitigations

| Threat | Mitigation |
|---|---|
| User tampers cart price | Server recalculates from DB in `/api/checkout/create-order` |
| User submits order for out-of-stock item | Server validates stock before creating Razorpay order |
| User fakes payment success | Server verifies HMAC signature with Razorpay secret in `/api/checkout/verify-payment` |
| Public user reads orders | RLS policy `admin_read_orders` restricts to admin only |
| Public user edits products | RLS policy `admin_*` restricts mutations to admin only |
| Service role key leaked | It is only in `.env.local` and server-side code (never client) |
| Razorpay secret leaked | It is only in server-side API routes (never client) |
| Admin pages accessed without auth | Middleware + layout both verify `admin_users` table server-side |
| Duplicate payment processing | Idempotent verification (check `payment_status === 'paid'`) |
| Stock reduced before payment | Stock only reduces inside `/api/checkout/verify-payment` after signature OK |
| Untrusted input | Zod validation on every API route input |
| CSRF / XSS | Security headers + `no-store` secrets + Supabase SSR cookies |

### Environment Variable Safety
- All variables prefixed with `NEXT_PUBLIC_` are explicitly public.
- Service role key & Razorpay secret **never** have `NEXT_PUBLIC_` prefix.
- Server-only code imports `process.env.SUPABASE_SERVICE_ROLE_KEY` and `process.env.RAZORPAY_KEY_SECRET` — these are not inlined in client bundles.

---

## 📦 Database Schema (6 tables)

1. **products** — name, slug, description, category, price, discount_price, fabric, wash_care, is_featured, is_active
2. **product_images** — url, alt_text, position
3. **product_variants** — size, color, color_hex, sku, stock
4. **orders** — customer info, shipping address, financials, payment + order status, Razorpay IDs
5. **order_items** — product/variant snapshot at time of order (immutable history)
6. **admin_users** — links Supabase Auth user to admin role

See `supabase/schema.sql` for the full DDL + RLS policies.

---

## 💳 Payment Flow (End-to-End)

1. Customer fills checkout form → clicks **Pay Securely with Razorpay**
2. Frontend POSTs to `/api/checkout/create-order` with form + cart
3. Server:
   - Validates input with Zod
   - Fetches products from DB using service role
   - Recalculates prices from DB (ignores browser price)
   - Validates stock for each variant
   - Creates Razorpay order
   - Inserts `orders` row (status: pending) + `order_items` snapshots
4. Frontend receives `{ razorpayOrderId, amount }`
5. Razorpay checkout modal opens (loaded from CDN)
6. Customer pays via UPI / card / net banking / wallet
7. On payment success, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
8. Frontend POSTs to `/api/checkout/verify-payment`
9. Server:
   - Verifies HMAC signature: `HMAC_SHA256(secret, razorpayOrderId + "|" + razorpayPaymentId)` matches signature
   - Verifies order is still `pending` (idempotency)
   - Updates order to `paid` and stores `razorpay_payment_id`
   - Reduces variant stock
10. Frontend clears cart, redirects to `/order-success?orderId=…`

**Failed payment** → order stays `pending` → no stock reduced.
**Duplicate verification** → idempotent check returns success without re-reducing stock.
**Invalid signature** → 400 error, order stays unpaid.

---

## 🧑‍💻 For Developers

### Code Quality
- TypeScript strict mode
- No `any` in business logic
- Server logic separated from UI
- All validation schemas in `lib/validations.ts`
- All Supabase queries in `lib/queries/`
- Reusable UI components

### Scripts
```bash
npm run dev         # Development server
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Run ESLint
npm run type-check  # TypeScript only
```

---

## 📝 License

This codebase is the property of Vastra. Use it as a foundation for your own MVP.

---

## 🆘 Support

- Issues? Check the Supabase logs + Vercel logs first
- Razorpay issues? Check [razorpay.com/docs](https://razorpay.com/docs)
- Supabase issues? Check [supabase.com/docs](https://supabase.com/docs)

**Built with care for Indian craftsmanship 🇮🇳**

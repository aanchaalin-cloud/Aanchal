// ============================================================
// CORE DATABASE TYPES
// These mirror the Supabase table structures exactly.
// ============================================================

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  discount_price: number | null;
  fabric: string | null;
  wash_care: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  sku: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  order_status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  size: string | null;
  color: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
};

// ============================================================
// ENUM-LIKE TYPES
// ============================================================

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

// ============================================================
// COMPOSED / ENRICHED TYPES
// Used when joining tables (e.g. product + images + variants)
// ============================================================

export type ProductWithDetails = Product & {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

// ============================================================
// CART TYPES (client-side only — never trusted server-side)
// ============================================================

export type CartItem = {
  product_id: string;
  variant_id: string;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  selected_size: string | null;
  selected_color: string | null;
  sku: string | null;
  // Display-only data. Checkout recalculates price and stock from the database.
  display_price: number;
  available_stock: number;
  quantity: number;
};

export type Cart = {
  items: CartItem[];
};

// ============================================================
// API RESPONSE TYPES
// ============================================================

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  code?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================
// CHECKOUT TYPES
// ============================================================

export type CheckoutFormData = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  notes?: string;
};

export type RazorpayOrderResponse = {
  orderId: string;          // Supabase order UUID
  razorpayOrderId: string;  // Razorpay order ID
  amount: number;           // in paise
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  statusToken: string;
};

export type PublicOrderStatus = {
  id: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  total_amount: number;
  created_at: string;
};

export type PaymentVerificationPayload = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

// ============================================================
// ADMIN FORM TYPES
// ============================================================

export type ProductFormData = {
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  discount_price?: number | null;
  fabric: string;
  wash_care: string;
  is_featured: boolean;
  is_active: boolean;
};

export type VariantFormData = {
  id?: string;       // present when editing existing variant
  size: string;
  color: string;
  color_hex: string;
  sku: string;
  stock: number;
};

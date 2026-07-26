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
  notes: string | null;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_method: PaymentMethod;
  prepaid_amount: number;
  cod_amount: number;
  discount_amount: number;
  coupon_id: string | null;
  shipping_provider: string | null;
  tracking_id: string | null;
  tracking_url: string | null;
  shipping_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery_date: string | null;
  packaging_status: PackagingStatus;
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
// NEW: ORDER MEASUREMENTS
// ============================================================

export type OrderMeasurement = {
  id: string;
  order_id: string;
  chest: number;
  waist: number;
  full_height: number;
  unit: "cm" | "inches";
  personalisation_request: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// NEW: ORDER STATUS HISTORY
// ============================================================

export type OrderStatusHistoryEntry = {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

// ============================================================
// NEW: COUPONS
// ============================================================

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponUsage = {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_email: string;
  discount_amount: number;
  created_at: string;
};

// ============================================================
// NEW: PRODUCT REVIEWS
// ============================================================

export type Review = {
  id: string;
  product_id: string;
  order_id: string | null;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  image_url: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
};

// ============================================================
// NEW: ORDER NOTIFICATIONS
// ============================================================

export type OrderNotification = {
  id: string;
  order_id: string;
  customer_phone: string;
  type: NotificationType;
  provider: string;
  status: "pending" | "sent" | "failed";
  provider_message_id: string | null;
  failure_reason: string | null;
  sent_at: string | null;
  created_at: string;
};

// ============================================================
// ENUM-LIKE TYPES
// ============================================================

export type PaymentStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_production"
  | "ready_to_ship"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refunded";

export type PaymentMethod = "prepaid" | "cod";

export type PackagingStatus = "pending" | "packed" | "ready_for_pickup";

export type NotificationType =
  | "order_confirmed"
  | "order_shipped"
  | "tracking_info"
  | "delivery_day"
  | "order_delivered";

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

export type OrderWithMeasurements = OrderWithItems & {
  order_measurements: OrderMeasurement | null;
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

export type MeasurementData = {
  chest: number;
  waist: number;
  full_height: number;
  unit: "cm" | "inches";
  personalisation_request?: string;
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
  paymentMethod: PaymentMethod;
  prepaidAmount: number;
  codAmount: number;
  discountAmount: number;
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

// ============================================================
// COUPON FORM (Admin)
// ============================================================

export type CouponFormData = {
  code: string;
  description: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
};

// ============================================================
// REVIEW FORM (Customer)
// ============================================================

export type ReviewFormData = {
  product_id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title?: string;
  body: string;
};

// ============================================================
// REWARD SUBMISSIONS
// ============================================================

export type RewardSubmission = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  social_url: string;
  platform: "instagram" | "youtube" | "facebook" | "other";
  review_title: string | null;
  review_body: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type RewardVoucher = {
  id: string;
  submission_id: string;
  code: string;
  customer_email: string;
  value: number;
  is_used: boolean;
  used_by_order_id: string | null;
  expires_at: string;
  created_at: string;
};

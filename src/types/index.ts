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
  order_number: string | null;
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
  payment_provider: PaymentProvider | null;
  paytm_order_id: string | null;
  paytm_txn_id: string | null;
  payment_method: PaymentMethod;
  prepaid_amount: number;
  cod_amount: number;
  discount_amount: number;
  coupon_id: string | null;
  reward_voucher_code: string | null;
  shipping_provider: string | null;
  tracking_id: string | null;
  tracking_url: string | null;
  shipping_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_note: string | null;
  influencer_code: string | null;
  estimated_delivery_date: string | null;
  packaging_status: PackagingStatus;
  shiprocket_shipment_id: string | null;
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

// ============================================================
// ORDER MEASUREMENTS
// ============================================================

export type OrderMeasurement = {
  id: string;
  order_id: string;
  chest: number;
  waist: number;
  full_height: number;
  shoulder: number | null;
  unit: "cm" | "inches";
  personalisation_request: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// ORDER STATUS HISTORY
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

export type PaymentProvider = "razorpay" | "paytm";

export type PackagingStatus = "pending" | "packed" | "ready_for_pickup";

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
// REVIEW TYPES (public API response shape)
// ============================================================

export type ProductReview = {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  created_at: string;
  images?: string[]; // optional public URLs of uploaded review images
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
  shoulder: number;
  unit: "cm" | "inches";
  personalisation_request?: string;
};

export type RazorpayOrderResponse = {
  orderId: string;          // Supabase order UUID
  paymentGateway: PaymentProvider;
  alreadyPaid?: boolean;    // true when resuming an already-settled order
  razorpayOrderId?: string; // Razorpay order ID (gateway = razorpay)
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
  paytm?: {
    paytmOrderId: string;
    txnToken: string;
    redirectUrl: string;
  };
};

export type PublicOrderStatus = {
  id: string;
  order_number: string | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  total_amount: number;
  created_at: string;
  payment_provider: PaymentProvider | null;
  paytm_order_id: string | null;
};

// ============================================================
// ADMIN FORM TYPES
// ============================================================

export type VariantFormData = {
  id?: string;       // present when editing existing variant
  size: string;
  color: string;
  color_hex: string;
  sku: string;
  stock: number;
};

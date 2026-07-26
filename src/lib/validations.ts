import { z } from "zod";

// ============================================================
// MEASUREMENT SCHEMA
// Validates custom fit measurements in centimetres (cm).
// Sensible range: chest 50-150cm, waist 40-130cm, height 100-220cm
// ============================================================
export const measurementSchema = z.object({
  chest: z
    .number()
    .min(50, "Chest must be at least 50 cm")
    .max(150, "Chest must be at most 150 cm"),
  waist: z
    .number()
    .min(40, "Waist must be at least 40 cm")
    .max(130, "Waist must be at most 130 cm"),
  full_height: z
    .number()
    .min(100, "Height must be at least 100 cm")
    .max(220, "Height must be at most 220 cm"),
  unit: z.literal("cm"),
  personalisation_request: z
    .string()
    .max(1000, "Personalisation request is too long")
    .optional(),
});

export type MeasurementInput = z.infer<typeof measurementSchema>;

// ============================================================
// COUPON VALIDATION SCHEMA (Admin)
// ============================================================
export const couponSchema = z
  .object({
    code: z
      .string()
      .min(3, "Coupon code is required")
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, "Code must be alphanumeric with hyphens/underscores only"),
    description: z.string().max(500).optional(),
    discount_type: z.enum(["fixed", "percentage"]),
    discount_value: z
      .number()
      .min(1, "Discount value must be at least 1")
      .max(100000, "Discount value is too high"),
    min_order_amount: z.number().min(0).max(1000000).nullable().optional(),
    max_discount_amount: z.number().min(0).max(1000000).nullable().optional(),
    usage_limit: z.number().int().min(1).max(1000000).nullable().optional(),
    per_customer_limit: z.number().int().min(1).max(100).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discount_type === "percentage" && data.discount_value > 100) return false;
      return true;
    },
    { message: "Percentage discount cannot exceed 100%" }
  );

export type CouponInput = z.infer<typeof couponSchema>;

// ============================================================
// COUPON APPLICATION SCHEMA (Customer)
// ============================================================
export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50),
});

// ============================================================
// REVIEW SCHEMA (Customer)
// ============================================================
export const reviewSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  customer_name: z
    .string()
    .min(2, "Name is required")
    .max(100),
  customer_email: z
    .string()
    .email("Invalid email address")
    .max(200),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  title: z.string().max(200).optional(),
  body: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review is too long"),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// ============================================================
// CHECKOUT / ORDER CREATION SCHEMA
// Validates customer form inputs server-side before creating order
// ============================================================
export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  customer_email: z
    .string()
    .email("Invalid email address")
    .max(200, "Email is too long"),
  customer_phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  address_line1: z
    .string()
    .min(5, "Address is too short")
    .max(200, "Address is too long"),
  address_line2: z.string().max(200, "Address is too long").optional(),
  city: z
    .string()
    .min(2, "City is required")
    .max(100, "City name is too long"),
  state: z
    .string()
    .min(2, "State is required")
    .max(100, "State name is too long"),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  notes: z.string().max(500, "Notes are too long").optional(),
  // Custom fit measurements — required
  measurements: measurementSchema,
  // Payment method
  payment_method: z.enum(["prepaid", "cod"]),
  // Coupon code (optional)
  coupon_code: z.string().max(50).optional(),
  // Cart items — validated but prices are NOT trusted (recalculated server-side)
  cartItems: z
    .array(
      z.object({
        productId: z.string().uuid("Invalid product ID"),
        variantId: z.string().uuid("A product variant is required"),
        quantity: z
          .number()
          .int("Quantity must be a whole number")
          .min(1, "Quantity must be at least 1")
          .max(10, "Maximum 10 items per product"),
      })
    )
    .min(1, "Cart cannot be empty")
    .max(20, "Too many items in cart"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ============================================================
// PAYMENT VERIFICATION SCHEMA
// Validates Razorpay callback data before verifying signature
// ============================================================
export const paymentVerificationSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  razorpayOrderId: z
    .string()
    .min(1, "Missing Razorpay order ID")
    .startsWith("order_", "Invalid Razorpay order ID format"),
  razorpayPaymentId: z
    .string()
    .min(1, "Missing Razorpay payment ID")
    .startsWith("pay_", "Invalid Razorpay payment ID format"),
  razorpaySignature: z.string().min(1, "Missing Razorpay signature"),
});

export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;

// ============================================================
// PRODUCT FORM SCHEMA (Admin)
// Used for creating and editing products
// ============================================================
export const productSchema = z.object({
  name: z
    .string()
    .min(2, "Product name is required")
    .max(200, "Name is too long"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .max(200, "Slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  description: z.string().max(5000, "Description is too long").optional(),
  category: z.string().min(1, "Category is required").max(100),
  price: z
    .number()
    .min(1, "Price must be at least ₹1")
    .max(1000000, "Price is too high"),
  discount_price: z
    .number()
    .min(0)
    .max(1000000)
    .nullable()
    .optional(),
  fabric: z.string().max(200, "Fabric description is too long").optional(),
  wash_care: z.string().max(500, "Wash care is too long").optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

// ============================================================
// ADMIN PRODUCT CREATE / UPDATE SCHEMA (includes images + variants)
// ============================================================
export const productCreateSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200),
  slug: z
    .string()
    .min(2, "Slug is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().min(1, "Category is required").max(100),
  price: z.number().min(1, "Price must be at least ₹1").max(1000000),
  discount_price: z.number().min(0).max(1000000).optional().nullable(),
  fabric: z.string().max(200).optional().nullable(),
  wash_care: z.string().max(500).optional().nullable(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  images: z.array(z.string().max(2000)).max(20).default([]),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        size: z.string().max(50).optional().nullable(),
        color: z.string().max(100).optional().nullable(),
        color_hex: z
          .string()
          .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
          .optional()
          .nullable()
          .or(z.literal("")),
        sku: z.string().max(100).optional().nullable(),
        stock: z
          .number()
          .int("Stock must be a whole number")
          .min(0, "Stock cannot be negative")
          .max(10000),
      })
    )
    .max(50, "Maximum 50 variants per product")
    .default([]),
}).refine((data) => {
  if (data.discount_price != null && data.discount_price >= data.price) {
    return false;
  }
  return true;
}, { message: "Discount price must be less than regular price" });

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

// ============================================================
// ORDER STATUS UPDATE SCHEMA (Admin)
// ============================================================
export const orderStatusSchema = z.object({
  order_status: z.enum([
    "pending",
    "confirmed",
    "in_production",
    "ready_to_ship",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "return_requested",
    "returned",
    "refunded",
  ]),
  notes: z.string().max(500).optional(),
  tracking_id: z.string().max(200).optional(),
  tracking_url: z.string().max(2000).optional(),
  shipping_provider: z.string().max(100).optional(),
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

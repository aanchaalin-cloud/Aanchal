import { z } from "zod";

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
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;



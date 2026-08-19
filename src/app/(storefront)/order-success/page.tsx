import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getPublicOrderStatus } from "@/lib/orders/public-status";
import { formatDate, formatPrice, getOrderStatusLabel } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import {
  buildWhatsAppOrderMessage,
  getWhatsAppNumber,
  getWhatsAppOrderLink,
  type WhatsAppOrderSummary,
} from "@/lib/whatsapp";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";
import PaymentStatusRefresher from "@/components/checkout/PaymentStatusRefresher";
import OrderRetryButton from "@/components/checkout/OrderRetryButton";
import CancelOrderButton from "@/components/checkout/CancelOrderButton";
import CartClearer from "@/components/checkout/CartClearer";
import WhatsAppConfirmationCard from "@/components/checkout/WhatsAppConfirmationCard";

export const metadata: Metadata = {
  title: "Order Status",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ orderId?: string; statusToken?: string; refresh?: string }>;
};

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { orderId, statusToken, refresh } = await searchParams;
  const validRequest =
    typeof orderId === "string" &&
    /^[0-9a-f-]{36}$/i.test(orderId) &&
    typeof statusToken === "string";
  const order = validRequest
    ? await getPublicOrderStatus(orderId!, statusToken!)
    : null;

  if (!order) {
    return (
      <StorefrontEmptyState
        icon={AlertCircle}
        title="Order status unavailable"
        message="This order link is invalid or incomplete. Use the link shown after checkout, or contact support with your order ID."
        actionLabel="Return to Shop"
        actionHref="/shop"
      />
    );
  }

  const isWhatsApp = order.confirmation_method === "whatsapp";
  const isPaid = order.payment_status === "paid" || order.payment_status === "partially_paid";
  const isFailed = order.payment_status === "failed";
  const isRefunded = order.payment_status === "refunded";

  // WhatsApp orders are driven by order_status: a "pending" WhatsApp order is
  // an awaiting-confirmation request (not an unpaid payment), and later states
  // must not be conflated with "Order Confirmed".
  const isWhatsAppPending = isWhatsApp && order.order_status === "pending";
  const isWhatsAppConfirmed =
    isWhatsApp &&
    ["confirmed", "in_production", "ready_to_ship", "shipped", "out_for_delivery", "delivered"].includes(
      order.order_status
    );

  const cancellable =
    !["delivered", "cancelled", "return_requested", "returned", "refunded"].includes(
      order.order_status
    );
  const dispatched =
    order.order_status === "shipped" || order.order_status === "out_for_delivery";

  let StatusIcon = Clock;
  let title = "Payment Pending";
  let description = Messages.paymentPending;

  if (isWhatsApp) {
    if (order.order_status === "pending") {
      title = "Order request received";
      description =
        "Your order request has been prepared. Please send the prepared WhatsApp message to confirm your order. Payment will be confirmed separately with Aanchal.";
    } else if (order.order_status === "cancelled") {
      StatusIcon = XCircle;
      title = "Order Cancelled";
      description =
        "Your order was cancelled. Please contact support if you have any questions.";
    } else if (["return_requested", "returned", "refunded"].includes(order.order_status)) {
      StatusIcon = AlertCircle;
      title = "Order Returned / Refunded";
      description =
        "Your order has been returned or refunded. Please contact support if you have any questions.";
    } else if (isWhatsAppConfirmed) {
      StatusIcon = CheckCircle;
      title = "Order Confirmed";
      description =
        "Thank you! Your order has been confirmed by Aanchal. We will arrange the payment and get in touch with you on WhatsApp.";
    } else {
      title = "Order Status";
      description = `Current status: ${getOrderStatusLabel(order.order_status)}`;
    }
  } else if (isPaid) {
    StatusIcon = CheckCircle;
    title = "Order Confirmed";
    description = Messages.orderConfirmed;
  } else if (isFailed) {
    StatusIcon = XCircle;
    title = "Payment Failed";
    description = Messages.paymentError;
  } else if (isRefunded) {
    StatusIcon = AlertCircle;
    title = "Payment Refunded";
    description = "This payment has been refunded. For details, please contact our support team.";
  }

  const iconColor = isPaid || isWhatsAppConfirmed
    ? "text-green-600"
    : isFailed || order.order_status === "cancelled"
    ? "text-[#C41E3A]"
    : "text-[#800020]";

  // Build the prepared WhatsApp message from authoritative server data.
  let whatsappMessage: string | null = null;
  if (isWhatsAppPending && order.order_items && order.address_line1 && order.customer_name) {
    const summary: WhatsAppOrderSummary = {
      orderNumber: order.order_number ?? order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone ?? "",
      customerEmail: order.customer_email ?? "",
      items: order.order_items.map((item) => ({
        productName: item.product_name,
        variant: [item.size, item.color].filter(Boolean).join(" / ") || null,
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      })),
      measurements: order.order_measurements
        ? {
            unit: order.order_measurements.unit ?? "inches",
            chest: Number(order.order_measurements.chest),
            waist: Number(order.order_measurements.waist),
            fullHeight: Number(order.order_measurements.full_height),
            shoulder:
              order.order_measurements.shoulder != null
                ? Number(order.order_measurements.shoulder)
                : null,
            personalisationRequest: order.order_measurements.personalisation_request,
          }
        : null,
      address: {
        line1: order.address_line1,
        line2: order.address_line2,
        city: order.city ?? "",
        state: order.state ?? "",
        pincode: order.pincode ?? "",
      },
      subtotal: order.subtotal ?? Number(order.total_amount),
      shippingFee: order.shipping_fee ?? 0,
      discountAmount: order.discount_amount ?? 0,
      totalAmount: Number(order.total_amount),
      couponCode: order.reward_voucher_code,
      influencerCode: order.influencer_code,
      notes: order.notes,
    };
    whatsappMessage = buildWhatsAppOrderMessage(summary);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <StatusIcon className={`mx-auto h-16 w-16 ${iconColor}`} />

      <h1 className="mt-6 text-3xl font-semibold text-[#1C1C1C]">
        {title}
      </h1>
      <p className="mt-4 text-base text-[#6B6B6B]">
        {description}
      </p>

      {isPaid && !isWhatsApp && (
        <div className="mt-6 rounded-sm border border-[#E5D5C5]/50 bg-white p-4 text-left text-sm text-[#6B6B6B]">
          <p>
            Your outfit will be stitched to your measurements and shipped in our
            signature packaging — gift-worthy from the moment it arrives.
          </p>
        </div>
      )}

      {isWhatsAppPending && whatsappMessage && (
        <WhatsAppConfirmationCard
          message={whatsappMessage}
          whatsappUrl={getWhatsAppOrderLink(whatsappMessage)}
          whatsappNumber={getWhatsAppNumber()}
          orderNumber={order.order_number}
        />
      )}

      <dl className="mt-8 grid grid-cols-1 gap-3 rounded-sm border border-[#E5D5C5]/50 bg-white p-5 text-left text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6B6B6B]">Order Number</dt>
          <dd className="font-mono font-medium text-[#1C1C1C]">
            {order.order_number ?? order.id}
          </dd>
        </div>
        <div>
          <dt className="text-[#6B6B6B]">Amount</dt>
          <dd className="font-medium text-[#1C1C1C]">
            {formatPrice(order.total_amount)}
          </dd>
        </div>
        <div>
          <dt className="text-[#6B6B6B]">Payment</dt>
          <dd className="font-medium capitalize text-[#1C1C1C]">
            {isWhatsApp ? "To be confirmed separately" : order.payment_status}
          </dd>
        </div>
        <div>
          <dt className="text-[#6B6B6B]">Order status</dt>
          <dd className="font-medium text-[#1C1C1C]">
            {getOrderStatusLabel(order.order_status)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[#6B6B6B]">Created</dt>
          <dd className="text-[#1C1C1C]">{formatDate(order.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {isPaid || isWhatsAppConfirmed ? (
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : isWhatsApp ? (
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded border border-[#800020]/30 px-6 py-3 text-sm font-medium text-[#800020] hover:bg-[#800020]/5 transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <OrderRetryButton
            orderId={order.id}
            statusToken={statusToken!}
            paymentProvider={order.payment_provider}
          />
        )}
        <a
          href="mailto:hello@aanchal.in"
          className="text-sm text-[#6B6B6B] underline hover:text-[#800020] transition-colors"
        >
          Contact Support
        </a>
      </div>

      {!isWhatsApp && cancellable && (
        <div className="mt-8">
          <CancelOrderButton orderId={order.id} statusToken={statusToken!} dispatched={dispatched} />
        </div>
      )}

      {!isWhatsApp && order.payment_provider === "paytm" && order.paytm_order_id && (
        <PaymentStatusRefresher
          orderId={order.id}
          paytmOrderId={order.paytm_order_id}
          paymentStatus={order.payment_status}
          refreshParam={refresh}
        />
      )}

      {/* Clear the cart once an order is recorded (WhatsApp flow) or paid (Paytm). */}
      <CartClearer orderId={order.id} confirmed={isPaid || isWhatsApp} />
    </div>
  );
}

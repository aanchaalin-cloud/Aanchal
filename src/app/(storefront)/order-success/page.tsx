import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getPublicOrderStatus } from "@/lib/orders/public-status";
import { formatDate, formatPrice, getOrderStatusLabel } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { StorefrontEmptyState } from "@/components/ui/StorefrontState";

export const metadata: Metadata = {
  title: "Order Status",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ orderId?: string; statusToken?: string }>;
};

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { orderId, statusToken } = await searchParams;
  const validRequest =
    typeof orderId === "string" &&
    /^[0-9a-f-]{36}$/i.test(orderId) &&
    typeof statusToken === "string";
  const order = validRequest
    ? await getPublicOrderStatus(orderId, statusToken)
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

  const isPaid = order.payment_status === "paid";
  const isFailed = order.payment_status === "failed";
  const isRefunded = order.payment_status === "refunded";

  let StatusIcon = Clock;
  let title = "Payment Pending";
  let description = Messages.paymentPending;

  if (isPaid) {
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

  const iconColor = isPaid
    ? "text-green-600"
    : isFailed
    ? "text-[#C41E3A]"
    : "text-[#800020]";

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <StatusIcon className={`mx-auto h-16 w-16 ${iconColor}`} />

      <h1 className="mt-6 text-3xl font-semibold text-[#1C1C1C]">
        {title}
      </h1>
      <p className="mt-4 text-base text-[#6B6B6B]">
        {description}
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-3 rounded-sm border border-[#E5D5C5]/50 bg-white p-5 text-left text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6B6B6B]">Order ID</dt>
          <dd className="break-all font-mono text-xs text-[#1C1C1C]">
            {order.id}
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
            {order.payment_status}
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
        {isPaid ? (
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
          >
            Try Again
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <a
          href="mailto:hello@aanchal.in"
          className="text-sm text-[#6B6B6B] underline hover:text-[#800020] transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
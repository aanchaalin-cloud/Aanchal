import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByIdAdmin, getOrderStatusHistory } from "@/lib/queries/orders";
import { formatPrice, formatDate, getOrderStatusLabel, getOrderStatusColor, getPaymentStatusColor, getPaymentMethodLabel, getConfirmationMethodLabel, getConfirmationMethodColor } from "@/lib/utils";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";
import { PaymentManager } from "@/components/admin/PaymentManager";
import { CreateShipmentButton } from "@/components/admin/CreateShipmentButton";
import { GenerateLabelButton } from "@/components/admin/GenerateLabelButton";
import { Ruler, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, statusHistory] = await Promise.all([
    getOrderByIdAdmin(id),
    getOrderStatusHistory(id),
  ]);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-stone-600 hover:text-stone-900">← Back to Orders</Link>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">
            {order.order_number ?? `Order ${order.id.slice(0, 8)}…`}
          </h1>
        </div>
        <OrderStatusUpdater
          orderId={order.id}
          currentStatus={order.order_status}
          packagingStatus={order.packaging_status}
          existingTrackingId={order.tracking_id}
          existingTrackingUrl={order.tracking_url}
          existingShippingProvider={order.shipping_provider}
          existingEstimatedDeliveryDate={order.estimated_delivery_date}
        />
        <CreateShipmentButton orderId={order.id} />
        {order.shiprocket_shipment_id && <GenerateLabelButton orderId={order.id} />}
      </div>

      {order.confirmation_method === "whatsapp" && (
        <div className="rounded-sm border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-medium text-green-900">
            WhatsApp-confirmed order — no online payment
          </p>
          <p className="mt-1 text-green-800">
            This order was placed without an online payment. The customer confirms
            payment directly with you on WhatsApp. Mark it <strong>confirmed</strong> once
            the payment/order is confirmed. Payment status will stay &quot;pending&quot; until you
            confirm it manually.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-4">Items</h2>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{item.product_name}</p>
                    <p className="text-xs text-stone-600">
                      {[item.size, item.color].filter(Boolean).join(" · ")}
                      {item.sku && ` · SKU: ${item.sku}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-900">
                      {formatPrice(item.unit_price)} × {item.quantity}
                    </p>
                    <p className="text-xs text-stone-600">{formatPrice(item.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-4">Payment Breakdown</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-stone-600">Subtotal</p><p className="font-medium">{formatPrice(order.subtotal)}</p></div>
              <div><p className="text-stone-600">Shipping</p><p className="font-medium">{formatPrice(order.shipping_fee)}</p></div>
              {order.discount_amount > 0 && (
                <div><p className="text-stone-600">Discount</p><p className="font-medium text-green-600">-{formatPrice(order.discount_amount)}</p></div>
              )}
              <div><p className="text-stone-600 font-semibold">Total</p><p className="font-semibold text-lg">{formatPrice(order.total_amount)}</p></div>
              <div>
                <p className="text-stone-600">Payment Method</p>
                <p className="font-medium">{getPaymentMethodLabel(order.payment_method)}</p>
              </div>
              <div>
                <p className="text-stone-600">Payment Status</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusColor(order.payment_status)}`}>{order.payment_status}</span>
              </div>
              <div>
                <p className="text-stone-600">Confirmation</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getConfirmationMethodColor(order.confirmation_method)}`}>
                  {getConfirmationMethodLabel(order.confirmation_method)}
                </span>
              </div>
              {order.confirmation_method === "whatsapp" ? (
                <div className="col-span-2 rounded-sm bg-green-50 border border-green-200 p-3">
                  <p className="text-xs text-green-900">
                    No online payment was taken. Payment is confirmed separately with the
                    customer (e.g. via WhatsApp). Use <strong>Order Status → Confirmed</strong>{" "}
                    once confirmed.
                  </p>
                </div>
              ) : (
                <>
                  <div><p className="text-stone-600">Paid Online</p><p className="font-medium">{formatPrice(order.prepaid_amount)}</p></div>
                  <div><p className="text-stone-600">COD Due</p><p className="font-medium">{formatPrice(order.cod_amount)}</p></div>
                </>
              )}
              {order.razorpay_order_id && <div className="col-span-2"><p className="text-stone-600">Razorpay Order</p><p className="font-mono text-xs break-all">{order.razorpay_order_id}</p></div>}
              {order.razorpay_payment_id && <div className="col-span-2"><p className="text-stone-600">Razorpay Payment</p><p className="font-mono text-xs break-all">{order.razorpay_payment_id}</p></div>}
            </div>
          </div>

          {/* Custom Measurements */}
          {order.order_measurements && (
            <div className="rounded-sm border border-[#D4A843]/30 bg-[#D4A843]/5 p-5">
              <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-[#95271D]" />
                Custom Fit Measurements
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-stone-600">Chest</p>
                  <p className="font-medium">{order.order_measurements.chest} in</p>
                </div>
                <div>
                  <p className="text-stone-600">Waist</p>
                  <p className="font-medium">{order.order_measurements.waist} in</p>
                </div>
                <div>
                  <p className="text-stone-600">Full Height</p>
                  <p className="font-medium">{order.order_measurements.full_height} in</p>
                </div>
                <div>
                  <p className="text-stone-600">Shoulder</p>
                  <p className="font-medium">
                    {order.order_measurements.shoulder ? `${order.order_measurements.shoulder} in` : "—"}
                  </p>
                </div>
              </div>
              {order.order_measurements.personalisation_request && (
                <div className="mt-3 rounded-sm bg-white p-3 border border-[#E5D5C5]/50">
                  <p className="text-xs font-medium text-stone-600 mb-1">Personalisation Request</p>
                  <p className="text-sm text-stone-900 italic">{order.order_measurements.personalisation_request}</p>
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="rounded-sm border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-600" />
                Status History
              </h2>
              <div className="space-y-3">
                {statusHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-stone-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.old_status && (
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getOrderStatusColor(entry.old_status)}`}>
                            {getOrderStatusLabel(entry.old_status)}
                          </span>
                        )}
                        {entry.old_status && <span className="text-stone-400">→</span>}
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getOrderStatusColor(entry.new_status)}`}>
                          {getOrderStatusLabel(entry.new_status)}
                        </span>
                        {entry.changed_by && (
                          <span className="text-xs text-stone-500">by {entry.changed_by}</span>
                        )}
                      </div>
                      {entry.notes && <p className="mt-0.5 text-xs text-stone-500">{entry.notes}</p>}
                      <p className="text-[10px] text-stone-400">{formatDate(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Customer</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-stone-600">Name:</span> {order.customer_name}</p>
              <p><span className="text-stone-600">Email:</span> {order.customer_email}</p>
              <p><span className="text-stone-600">Phone:</span> {order.customer_phone}</p>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Shipping Address</h2>
            <div className="text-sm text-stone-600 space-y-1">
              <p>{order.address_line1}</p>
              {order.address_line2 && <p>{order.address_line2}</p>}
              <p>{order.city}, {order.state} – {order.pincode}</p>
            </div>
          </div>

          {/* Status & Dates */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Order</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusColor(order.order_status)}`}>{getOrderStatusLabel(order.order_status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">Packaging</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  order.packaging_status === "ready_for_pickup" ? "bg-green-100 text-green-800" :
                  order.packaging_status === "packed" ? "bg-blue-100 text-blue-800" :
                  "bg-stone-100 text-stone-800"
                }`}>{order.packaging_status}</span>
              </div>
              <div className="flex justify-between"><span className="text-stone-600">Created</span><span>{formatDate(order.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-stone-600">Updated</span><span>{formatDate(order.updated_at)}</span></div>
              {order.shipped_at && <div className="flex justify-between"><span className="text-stone-600">Shipped</span><span>{formatDate(order.shipped_at)}</span></div>}
              {order.delivered_at && <div className="flex justify-between"><span className="text-stone-600">Delivered</span><span>{formatDate(order.delivered_at)}</span></div>}
              {order.cancelled_at && <div className="flex justify-between"><span className="text-stone-600">Cancelled</span><span>{formatDate(order.cancelled_at)}</span></div>}
              {(order.tracking_id || order.shipping_provider || order.estimated_delivery_date) && (
                <div className="rounded bg-blue-50 border border-blue-200 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Shipment</p>
                  {order.shipping_provider && <div className="flex justify-between text-sm"><span className="text-stone-600">Courier</span><span className="font-medium">{order.shipping_provider}</span></div>}
                  {order.tracking_id && (
                    <div className="text-sm">
                      <span className="text-stone-600">Tracking</span>
                      <p className="font-mono text-xs break-all mt-0.5">{order.tracking_id}</p>
                      {order.tracking_url && (
                        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#95271D] hover:underline mt-0.5 inline-block">
                          Track with courier →
                        </a>
                      )}
                    </div>
                  )}
                  {order.estimated_delivery_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Est. Delivery</span>
                      <span className="font-medium">{new Date(order.estimated_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  )}
                </div>
              )}
              {order.influencer_code && (
                <div>
                  <p className="text-stone-600">Influencer Code</p>
                  <p className="font-mono text-xs text-[#95271D]">{order.influencer_code}</p>
                </div>
              )}
              {order.cancellation_note && (
                <div>
                  <p className="text-stone-600">Cancellation Note</p>
                  <p className="text-xs text-stone-500">{order.cancellation_note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Manager */}
          <PaymentManager
            orderId={order.id}
            currentStatus={order.payment_status}
            confirmationMethod={order.confirmation_method}
            paymentMethod={order.payment_method}
            codAmount={order.cod_amount}
            prepaidAmount={order.prepaid_amount}
          />

          {order.notes && (
            <div className="rounded-sm border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-900 mb-2">Customer Notes</h2>
              <p className="text-sm text-stone-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

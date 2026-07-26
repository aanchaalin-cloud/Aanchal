import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByIdAdmin } from "@/lib/queries/orders";
import { formatPrice, formatDate, getOrderStatusLabel, getOrderStatusColor, getPaymentStatusColor } from "@/lib/utils";
import { OrderStatusUpdater } from "@/components/admin/OrderStatusUpdater";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrderByIdAdmin(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-stone-600 hover:text-stone-900">← Back to Orders</Link>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">Order {order.id.slice(0, 8)}…</h1>
        </div>
        <OrderStatusUpdater orderId={order.id} currentStatus={order.order_status} />
      </div>

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

          {/* Payment */}
          <div className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900 mb-4">Payment</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-stone-600">Subtotal</p><p className="font-medium">{formatPrice(order.subtotal)}</p></div>
              <div><p className="text-stone-600">Shipping</p><p className="font-medium">{formatPrice(order.shipping_fee)}</p></div>
              <div><p className="text-stone-600">Total</p><p className="font-semibold text-lg">{formatPrice(order.total_amount)}</p></div>
              <div>
                <p className="text-stone-600">Payment Status</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusColor(order.payment_status)}`}>{order.payment_status}</span>
              </div>
              {order.razorpay_order_id && <div><p className="text-stone-600">Razorpay Order</p><p className="font-mono text-xs">{order.razorpay_order_id}</p></div>}
              {order.razorpay_payment_id && <div><p className="text-stone-600">Razorpay Payment</p><p className="font-mono text-xs">{order.razorpay_payment_id}</p></div>}
            </div>
          </div>
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
            <h2 className="text-sm font-semibold text-stone-900 mb-3">Order Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Status</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusColor(order.order_status)}`}>{getOrderStatusLabel(order.order_status)}</span>
              </div>
              <div className="flex justify-between"><span className="text-stone-600">Created</span><span>{formatDate(order.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-stone-600">Updated</span><span>{formatDate(order.updated_at)}</span></div>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-sm border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-900 mb-2">Notes</h2>
              <p className="text-sm text-stone-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

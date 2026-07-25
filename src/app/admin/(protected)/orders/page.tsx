import Link from "next/link";
import { getAllOrdersAdmin } from "@/lib/queries/orders";
import { formatPrice, formatDate, getOrderStatusColor, getPaymentStatusColor } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { OrderFilters } from "./OrderFilters";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    payment_status?: string;
    order_status?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { payment_status, order_status } = await searchParams;
  let orders = await getAllOrdersAdmin();

  // Apply filters
  if (payment_status && payment_status !== "all") {
    orders = orders.filter((o) => o.payment_status === payment_status);
  }
  if (order_status && order_status !== "all") {
    orders = orders.filter((o) => o.order_status === order_status);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Orders</h1>
        <p className="text-sm text-stone-600 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <OrderFilters
        currentPaymentStatus={payment_status ?? "all"}
        currentOrderStatus={order_status ?? "all"}
      />

      {orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-sm">
          <p className="text-stone-600">
            {payment_status || order_status
              ? Messages.noOrdersFiltered
              : Messages.noOrders}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <table className="min-w-full divide-y divide-stone-100">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-600">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-stone-600">{order.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-stone-900">{order.customer_name}</p>
                    <p className="text-xs text-stone-600">{order.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">{order.customer_phone}</td>
                  <td className="px-4 py-3 text-sm font-medium text-stone-900">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${order.id}`} className="text-sm text-stone-600 hover:text-stone-900 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
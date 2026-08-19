"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { formatPrice, formatDate, getOrderStatusColor, getPaymentStatusColor, getConfirmationMethodLabel, getConfirmationMethodColor } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { OrderFilters } from "./OrderFilters";

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_amount: number;
  payment_status: string;
  confirmation_method: string | null;
  order_status: string;
  created_at: string;
};

type Props = {
  orders: Order[];
  currentPaymentStatus: string;
  currentOrderStatus: string;
  currentSearch: string;
};

export function OrdersPageClient({ orders, currentPaymentStatus, currentOrderStatus, currentSearch }: Props) {
  const [search, setSearch] = useState(currentSearch);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        (o.order_number?.toLowerCase().includes(q)) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <>
      <OrderFilters
        currentPaymentStatus={currentPaymentStatus}
        currentOrderStatus={currentOrderStatus}
        currentSearch={search}
        onSearch={setSearch}
      />

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-sm">
          <p className="text-stone-600">
            {currentSearch || currentPaymentStatus !== "all" || currentOrderStatus !== "all"
              ? Messages.noOrdersFiltered
              : Messages.noOrders}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <div className="min-w-full">
            <table className="w-full divide-y divide-stone-100">
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
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-stone-600">{order.order_number ?? `${order.id.slice(0, 8)}...`}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-stone-900">{order.customer_name}</p>
                      <p className="text-xs text-stone-600">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{order.customer_phone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{formatPrice(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                        {order.confirmation_method === "whatsapp" && (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getConfirmationMethodColor(order.confirmation_method)}`}>
                            {getConfirmationMethodLabel(order.confirmation_method)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getOrderStatusColor(order.order_status)}`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="text-sm text-stone-600 hover:text-stone-900 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

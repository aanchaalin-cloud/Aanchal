import { getAllOrdersAdmin } from "@/lib/queries/orders";
import { OrdersPageClient } from "./OrdersPageClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    payment_status?: string;
    order_status?: string;
    search?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { payment_status, order_status, search } = await searchParams;
  let orders = await getAllOrdersAdmin();

  // Server-side filter by payment_status and order_status
  if (payment_status && payment_status !== "all") {
    orders = orders.filter((o) => o.payment_status === payment_status);
  }
  if (order_status && order_status !== "all") {
    orders = orders.filter((o) => o.order_status === order_status);
  }
  // Search filter (server-side for initial load)
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        (o.order_number?.toLowerCase().includes(q)) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Orders</h1>
        <p className="text-sm text-stone-600 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      <OrdersPageClient
        orders={orders}
        currentPaymentStatus={payment_status ?? "all"}
        currentOrderStatus={order_status ?? "all"}
        currentSearch={search ?? ""}
      />
    </div>
  );
}

import Link from "next/link";
import { Package, ShoppingCart, AlertTriangle, IndianRupee, Truck, Clock, CheckCircle } from "lucide-react";
import { Messages } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: inProductionOrders },
    { count: readyToShipOrders },
    { count: shippedOrders },
    { count: deliveredOrders },
    { count: lowStockCount },
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "in_production"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "ready_to_ship"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "shipped"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "delivered"),
    supabase.from("product_variants").select("*", { count: "exact", head: true }).lt("stock", 5).gt("stock", 0),
  ]);

  // Revenue stats
  const { data: revenueData } = await supabase
    .from("orders")
    .select("total_amount, prepaid_amount, cod_amount, payment_status")
    .in("payment_status", ["paid", "partially_paid"]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
  const totalPrepaid = revenueData?.reduce((sum, o) => sum + (o.prepaid_amount ?? 0), 0) ?? 0;
  const totalCODPending = revenueData?.reduce((sum, o) => sum + (o.cod_amount ?? 0), 0) ?? 0;

  // Low stock variants
  const { data: lowStockVariants } = await supabase
    .from("product_variants")
    .select("id, size, color, stock, products(name, slug)")
    .lt("stock", 5)
    .gt("stock", 0)
    .limit(5);

  // Recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, customer_name, total_amount, order_status, payment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Pending reviews
  const { count: pendingReviews } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", false);

  // Pending rewards
  const { count: pendingRewards } = await supabase
    .from("reward_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const stats = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: `₹${totalPrepaid.toLocaleString("en-IN")} prepaid`, icon: IndianRupee, href: "/admin/orders" },
    { label: "Pending COD", value: `₹${totalCODPending.toLocaleString("en-IN")}`, sub: "Due on delivery", icon: Clock, href: "/admin/orders" },
    { label: "Total Orders", value: totalOrders ?? 0, sub: `${pendingOrders ?? 0} pending`, icon: ShoppingCart, href: "/admin/orders" },
    { label: "In Production", value: inProductionOrders ?? 0, sub: "Being crafted", icon: Package, href: "/admin/orders" },
    { label: "Ready to Ship", value: readyToShipOrders ?? 0, sub: "Awaiting pickup", icon: Truck, href: "/admin/orders" },
    { label: "Shipped", value: shippedOrders ?? 0, sub: "In transit", icon: Truck, href: "/admin/orders" },
    { label: "Delivered", value: deliveredOrders ?? 0, sub: "Completed", icon: CheckCircle, href: "/admin/orders" },
    { label: "Low Stock", value: lowStockCount ?? 0, sub: "Variants below 5", icon: AlertTriangle, href: "/admin/products" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-600 mt-1">Overview of your store</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-sm border border-stone-200 bg-white p-5 hover:border-stone-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-stone-600">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-stone-600" />
            </div>
            <p className="text-2xl font-semibold text-stone-900">{stat.value}</p>
            <p className="text-xs text-stone-600 mt-1">{stat.sub}</p>
          </Link>
        ))}
      </div>

      {/* Pending Actions */}
      {(pendingReviews ?? 0) > 0 || (pendingRewards ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-3">
          {(pendingReviews ?? 0) > 0 && (
            <Link href="/admin/reviews" className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
              {pendingReviews} Pending Review{pendingReviews !== 1 ? "s" : ""}
            </Link>
          )}
          {(pendingRewards ?? 0) > 0 && (
            <Link href="/admin/rewards" className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
              {pendingRewards} Pending Reward{pendingRewards !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-sm border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-stone-600 hover:text-stone-900">
              View all
            </Link>
          </div>
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="text-sm text-stone-600 text-center py-6">{Messages.noOrders}</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0 hover:bg-stone-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">{order.customer_name}</p>
                    <p className="text-xs text-stone-600">
                      ₹{order.total_amount} · {order.order_status}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                    order.payment_status === "paid"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {order.payment_status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="rounded-sm border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-900">Low Stock Variants</h2>
            <Link href="/admin/products" className="text-xs text-stone-600 hover:text-stone-900">
              Manage
            </Link>
          </div>
          {!lowStockVariants || lowStockVariants.length === 0 ? (
            <p className="text-sm text-stone-600 text-center py-6">All variants have sufficient stock</p>
          ) : (
            <div className="space-y-3">
              {lowStockVariants.map((variant) => {
                const product = Array.isArray(variant.products)
                  ? variant.products[0]
                  : variant.products;
                return (
                  <div key={variant.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{product?.name ?? "Unknown"}</p>
                      <p className="text-xs text-stone-600">
                        {[variant.size, variant.color].filter(Boolean).join(" · ") || "Default"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#800020]">
                      {variant.stock} left
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          <Package className="h-4 w-4" />
          Add New Product
        </Link>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          View All Orders
        </Link>
        <Link
          href="/admin/reviews"
          className="inline-flex items-center gap-2 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Reviews
        </Link>
        <Link
          href="/admin/rewards"
          className="inline-flex items-center gap-2 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Rewards
        </Link>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-2 rounded border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          View Storefront ↗
        </Link>
      </div>
    </div>
  );
}

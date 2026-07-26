import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ChevronRight, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { PackagingStatus } from "@/types";

const PACKAGING_BADGES: Record<PackagingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Not Packed", color: "bg-stone-100 text-stone-700", icon: <Clock className="h-3 w-3" /> },
  packed: { label: "Packed", color: "bg-blue-100 text-blue-700", icon: <Package className="h-3 w-3" /> },
  ready_for_pickup: { label: "Ready for Pickup", color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-stone-100 text-stone-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  in_production: { label: "In Production", color: "bg-amber-100 text-amber-700" },
  quality_check: { label: "QC", color: "bg-purple-100 text-purple-700" },
  ready_to_ship: { label: "Ready to Ship", color: "bg-green-100 text-green-700" },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-cyan-100 text-cyan-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  returned: { label: "Returned", color: "bg-orange-100 text-orange-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
};

export default async function PackagingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?setup=required");
  }

  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      order_status,
      packaging_status,
      total_amount,
      cod_amount,
      prepaid_amount,
      created_at,
      address_line1,
      city,
      state,
      pincode
    `)
    .in("order_status", ["confirmed", "in_production", "quality_check", "ready_to_ship", "shipped"])
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
        <p className="text-sm text-red-700">Failed to load packaging queue. Please try again.</p>
      </div>
    );
  }

  const allOrders = orders ?? [];

  const pendingPackaging = allOrders.filter(o => o.packaging_status === "pending" || !o.packaging_status);
  const packed = allOrders.filter(o => o.packaging_status === "packed");
  const readyForPickup = allOrders.filter(o => o.packaging_status === "ready_for_pickup");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Packaging Queue</h1>
        <p className="mt-1 text-sm text-stone-600">
          Track and manage order packaging status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600">Needs Packaging</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Package className="h-4 w-4 text-amber-600" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{pendingPackaging.length}</p>
        </div>
        <div className="rounded border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600">Packed (Awaiting Pickup)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{packed.length}</p>
        </div>
        <div className="rounded border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600">Ready for Pickup</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Package className="h-4 w-4 text-green-600" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-stone-900">{readyForPickup.length}</p>
        </div>
      </div>

      {/* Packaging List */}
      {allOrders.length === 0 ? (
        <div className="rounded border border-stone-200 bg-white p-12 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-stone-900">All caught up!</p>
          <p className="mt-1 text-xs text-stone-600">No orders currently need packaging.</p>
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-4 py-3 font-medium text-stone-600">Order</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Customer</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Status</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Packaging</th>
                  <th className="px-4 py-3 font-medium text-stone-600 text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {allOrders.map((order) => {
                  const pkg = PACKAGING_BADGES[(order.packaging_status as PackagingStatus) || "pending"];
                  const status = STATUS_BADGES[order.order_status] ?? { label: order.order_status, color: "bg-stone-100 text-stone-700" };

                  return (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-stone-900">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-700">{order.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pkg.color}`}>
                          {pkg.icon}
                          {pkg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-900">
                        {formatPrice(order.total_amount ?? 0)}
                        {(order.cod_amount ?? 0) > 0 && (
                          <span className="ml-1 text-[10px] text-orange-600">COD</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                        >
                          Manage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

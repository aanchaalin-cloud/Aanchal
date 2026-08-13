"use client";

import { useState, useEffect } from "react";
import { Search, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders: number;
  total_spent: number;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const qs = debounced ? `?q=${encodeURIComponent(debounced)}` : "";
        const res = await fetch(`/api/admin/customers${qs}`);
        const data = await res.json();
        if (active && data.success) setCustomers(data.data ?? []);
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Customers</h1>
        <p className="mt-1 text-sm text-stone-600">
          All registered customers with their order history
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          className="w-full rounded border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-stone-600">Loading...</p>
      ) : customers.length === 0 ? (
        <div className="rounded-sm border border-stone-200 bg-white py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm text-stone-600">No customers found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
          <div className="min-w-[720px]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{c.full_name}</p>
                    <p className="text-xs text-stone-500">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {c.orders}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-900">
                    ₹{c.total_spent.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

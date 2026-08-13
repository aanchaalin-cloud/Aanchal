"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Share2,
  ExternalLink,
  Megaphone,
  Wallet,
  TrendingUp,
  Clock3,
  PackageCheck,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type EarningRow = {
  id: string;
  order_id: string;
  order_amount: number;
  commission_amount: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
};

type Props = {
  name: string;
  referralCode: string;
  earnings: { total: number; pending: number; paid: number; orders: number };
  history: EarningRow[];
};

export function InfluencerDashboard({ name, referralCode, earnings, history }: Props) {
  const [copied, setCopied] = useState(false);

  const whatsappUrl = getWhatsAppUrl(
    `Shop Aanchal and get 10% off! Use my code ${referralCode} at checkout. Shop here: `
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?ref=${referralCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/account?tab=influencer"
        className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#95271D] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Account
      </Link>

      <div className="mt-4 rounded-sm border border-[#E5D5C5]/60 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#95271D]/10">
              <Megaphone className="h-6 w-6 text-[#95271D]" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-[#1C1C1C] sm:text-3xl">
                Influencer Panel
              </h1>
              <p className="mt-0.5 text-sm text-[#6B6B6B]">
                Welcome back, {name}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Approved Partner
          </span>
        </div>

        {/* Referral code */}
        <div className="mt-6 rounded-sm bg-[#FFF8F3] border border-[#E5D5C5] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#95271D]">
            Your Referral Code
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="rounded border border-[#E5D5C5] bg-white px-5 py-3 font-mono text-2xl font-bold tracking-[0.2em] text-[#1C1C1C]">
              {referralCode}
            </p>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded bg-[#95271D] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share on WhatsApp
            </a>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded border border-[#E5D5C5] bg-white px-4 py-2 text-sm font-medium text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Copy Link
            </button>
          </div>
          <p className="mt-3 text-xs text-[#6B6B6B]">
            Friends get 10% off (up to ₹500) and you earn 10% commission on every paid order through your code.
          </p>
        </div>

        {/* Earnings summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={TrendingUp} label="Total Earned" value={`₹${earnings.total.toLocaleString("en-IN")}`} />
          <StatCard icon={Clock3} label="Pending" value={`₹${earnings.pending.toLocaleString("en-IN")}`} accent />
          <StatCard icon={Wallet} label="Paid Out" value={`₹${earnings.paid.toLocaleString("en-IN")}`} />
          <StatCard icon={PackageCheck} label="Referral Orders" value={String(earnings.orders)} />
        </div>

        {/* Commission history */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-[#1C1C1C]">Commission History</h2>
          {history.length === 0 ? (
            <div className="rounded-sm border border-[#E5D5C5]/60 bg-[#FFF8F3] p-8 text-center text-sm text-[#6B6B6B]">
              No commissions yet. Share your code to start earning!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-[#E5D5C5]/60">
              <div className="min-w-[560px] overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FFF8F3] text-xs uppercase tracking-wide text-[#6B6B6B]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Order Value</th>
                    <th className="px-4 py-3 font-medium">Commission</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D5C5]/60">
                  {history.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-4 py-3 font-mono text-xs text-[#6B6B6B]">
                        {row.order_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3 text-[#1C1C1C]">
                        ₹{row.order_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1C1C1C]">
                        ₹{row.commission_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : row.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {row.status === "pending" ? "Pending" : row.status === "paid" ? "Paid" : "Cancelled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-sm border border-[#E5D5C5]/60 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent ? "text-amber-600" : "text-[#95271D]"}`} />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6B6B]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-bold text-[#1C1C1C]">{value}</p>
    </div>
  );
}

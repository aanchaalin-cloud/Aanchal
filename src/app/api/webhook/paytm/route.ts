import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createOrderStatusToken } from "@/lib/orders/public-status";
import { finalizePaidOrder } from "@/lib/orders/finalize-payment";
import {
  getPaytmConfig,
  verifyCallbackChecksum,
  verifySignature,
  paytmAmountToPaise,
} from "@/lib/paytm";
import { getOrderByProviderOrderId } from "@/lib/orders/get-order";
import { warn, error as logError } from "@/lib/logger";
import crypto from "crypto";

/**
 * Paytm callback handler (server-to-server).
 *
 * Paytm POSTs the transaction result to the configured callbackUrl. We verify
 * the checksum, confirm the amount server-side, then finalise the order
 * idempotently. The response is an HTML page that redirects the customer's
 * browser to the order status page.
 *
 * Signature verification is mandatory — payment state is never trusted
 * from the client.
 */
type PaytmOrder = {
  id: string;
  payment_method?: string;
  payment_status?: string;
  order_status?: string | null;
  total_amount?: number | string | null;
  prepaid_amount?: number | string | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const paytmConfig = getPaytmConfig();
    if (!paytmConfig) {
      logError("Paytm not configured", { traceId });
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const contentType = request.headers.get("content-type") ?? "";

    // ── Parse + verify the callback payload ──
    let orderId = "";
    let txnId = "";
    let txnAmountPaise: number | null = null;
    let resultStatus = "";

    if (contentType.includes("json") || rawBody.trimStart().startsWith("{")) {
      // S2S webhook (JSON) — signature is over JSON.stringify(body)
      const json = JSON.parse(rawBody) as {
        head?: { signature?: string };
        body?: {
          orderId?: string;
          txnId?: string;
          txnAmount?: string;
          resultInfo?: { resultStatus?: string; resultCode?: string; resultMsg?: string };
        };
      };
      if (!json?.body || !json.head?.signature) {
        warn("Incomplete JSON callback", { traceId });
        return NextResponse.json({ error: "Incomplete payload" }, { status: 400 });
      }
      const signed = JSON.stringify(json.body);
      if (!verifySignature(signed, paytmConfig.merchantKey, json.head.signature)) {
        warn("Invalid JSON signature", { traceId });
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
      orderId = json.body.orderId ?? "";
      txnId = json.body.txnId ?? "";
      if (json.body.txnAmount) txnAmountPaise = paytmAmountToPaise(json.body.txnAmount);
      resultStatus = json.body.resultInfo?.resultStatus ?? "";
    } else {
      // Form callback (redirect flow)
      const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
      const checksum = params.CHECKSUMHASH ?? null;
      if (!verifyCallbackChecksum(params, paytmConfig.merchantKey, checksum)) {
        warn("Invalid form checksum", { traceId });
        return NextResponse.json({ error: "Invalid checksum" }, { status: 400 });
      }
      orderId = params.ORDERID ?? "";
      txnId = params.TXNID ?? "";
      if (params.TXNAMOUNT) txnAmountPaise = paytmAmountToPaise(params.TXNAMOUNT);
      resultStatus = params.STATUS ?? "";
    }

    if (!orderId) {
      warn("Missing ORDERID", { traceId });
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    // Use shared order fetch helper to keep selects consistent
    const { data, error: orderError } = await getOrderByProviderOrderId(
      "paytm",
      orderId,
      supabase,
      "id, payment_method, payment_status, order_status, total_amount, prepaid_amount"
    );
    const order = data as PaytmOrder | null;

    if (orderError || !order) {
      warn("No local order for Paytm order", { traceId, orderId, error: orderError?.message });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const alreadyProcessed =
      order.payment_status === "paid" || order.payment_status === "partially_paid";

    // Idempotent — safe to receive the same callback multiple times
    if (!alreadyProcessed && resultStatus === "TXN_SUCCESS") {
      const expectedPaise =
        order.payment_method === "cod"
          ? Math.round(Number(order.prepaid_amount) * 100)
          : Math.round(Number(order.total_amount) * 100);

      if (txnAmountPaise != null && txnAmountPaise !== expectedPaise) {
        warn("Amount mismatch", { traceId, orderId, expectedPaise, txnAmountPaise });
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      const result = await finalizePaidOrder(order.id, "paytm", txnId || null, { ...order, order_status: order.order_status ?? undefined });
      if (!result.success) {
        logError("Finalize failed for order", { traceId, orderId: order.id, error: result.error });
        return NextResponse.json({ error: "Finalization failed" }, { status: 500 });
      }
    } else if (!alreadyProcessed && resultStatus === "TXN_FAILURE") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id)
        .eq("payment_status", "pending");
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        old_status: order.order_status,
        new_status: order.order_status,
        changed_by: "system",
        notes: "Payment failed or declined (Paytm callback)",
      });
    }

    // ── Redirect the customer's browser to the order status page ──
    const statusToken = createOrderStatusToken(order.id, orderId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const redirectUrl = `${appUrl}/order-success?orderId=${encodeURIComponent(order.id)}&statusToken=${encodeURIComponent(statusToken)}&refresh=1`;

    return new NextResponse(htmlRedirect(redirectUrl), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    logError("Unexpected Paytm webhook error", { traceId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


function htmlRedirect(url: string): string {
  const escaped = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escaped}"></head>
<body>
  <script>window.location.replace("${escaped}");</script>
  <p>Redirecting to your order status…</p>
</body>
</html>`;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Transactional email via Resend's REST API (no SDK dependency).
 * Records sends in order_notifications (provider = "email") so the unique
 * partial index (order_id, type) WHERE status = 'sent' prevents duplicates.
 */

export type OrderEmailType =
  | "order_confirmed"
  | "order_shipped"
  | "tracking_info"
  | "delivery_day"
  | "order_delivered"
  | "order_cancelled";

type EmailTemplate = {
  subject: string;
  buildHtml: (params: Record<string, string | undefined>) => string;
};

const TEMPLATES: Record<OrderEmailType, EmailTemplate> = {
  order_confirmed: {
    subject: "Your Aanchal order is confirmed",
    buildHtml: ({ customerName, orderId }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Thank you for your order! Your payment has been confirmed and we've started working on your custom-fit piece.</p>
      <p><strong>Order ID:</strong> ${orderId ?? ""}</p>
      <p>We'll keep you updated as your order moves through production, packaging and shipping.</p>`,
  },
  order_shipped: {
    subject: "Your Aanchal order has shipped",
    buildHtml: ({ customerName, orderId, trackingId, trackingUrl, shippingProvider }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Great news — your Aanchal order <strong>#${orderId ?? ""}</strong> has been shipped!</p>
      ${trackingId ? `<p><strong>Tracking ID:</strong> ${trackingId}</p>` : ""}
      ${shippingProvider ? `<p><strong>Carrier:</strong> ${shippingProvider}</p>` : ""}
      ${trackingUrl ? `<p><a href="${trackingUrl}">Track your order here</a></p>` : ""}
      <p>We'll notify you again when it's out for delivery.</p>`,
  },
  tracking_info: {
    subject: "Tracking update for your Aanchal order",
    buildHtml: ({ customerName, orderId, trackingId, trackingUrl }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Here's the latest tracking information for your Aanchal order <strong>#${orderId ?? ""}</strong>:</p>
      ${trackingId ? `<p><strong>Tracking ID:</strong> ${trackingId}</p>` : ""}
      ${trackingUrl ? `<p><a href="${trackingUrl}">Track your order here</a></p>` : ""}
      <p>Thank you for shopping with Aanchal.</p>`,
  },
  delivery_day: {
    subject: "Your Aanchal order is out for delivery",
    buildHtml: ({ customerName, orderId }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Exciting news — your Aanchal order <strong>#${orderId ?? ""}</strong> is out for delivery today.</p>
      <p>Please keep your identification ready for verification.</p>`,
  },
  order_delivered: {
    subject: "Your Aanchal order has been delivered",
    buildHtml: ({ customerName, orderId }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Your Aanchal order <strong>#${orderId ?? ""}</strong> has been delivered!</p>
      <p>We hope you love your new custom-fit piece. If you do, we'd be honoured if you shared a review or a social post.</p>
      <p>With love,<br/>Team Aanchal</p>`,
  },
  order_cancelled: {
    subject: "Your Aanchal order has been cancelled",
    buildHtml: ({ customerName, orderId }) => `
      <p>Hello ${customerName ?? "there"},</p>
      <p>Your Aanchal order <strong>#${orderId ?? ""}</strong> has been cancelled.</p>
      <p>If you paid online, your refund (minus any applicable deductions) will be processed within 5-7 business days.</p>
      <p>We'd love to help if there's anything we can do — just reply to this email.</p>`,
  },
};

function brandHtml(title: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F1;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #EADFD3;">
          <tr>
            <td style="background:#800020;padding:22px 28px;text-align:center;">
              <span style="color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:2px;">AANCHAL</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#1C1C1C;font-size:14px;line-height:1.6;">
              <h1 style="font-size:18px;margin:0 0 16px;color:#800020;">${title}</h1>
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #EADFD3;color:#8A8A8A;font-size:12px;text-align:center;">
              Aanchal · Custom-fit Indian fashion · hello@aanchal.in
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderEmail(
  supabase: SupabaseClient,
  params: {
    type: OrderEmailType;
    to: string;
    customerName?: string;
    orderId: string;
    trackingId?: string;
    trackingUrl?: string;
    shippingProvider?: string;
  }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Aanchal <onboarding@resend.dev>";
  if (!apiKey) return;

  // Idempotency — only send each email type once per order
  const { data: existing } = await supabase
    .from("order_notifications")
    .select("id")
    .eq("order_id", params.orderId)
    .eq("type", params.type)
    .eq("provider", "email")
    .eq("status", "sent")
    .maybeSingle();

  if (existing) return;

  const template = TEMPLATES[params.type];
  const html = brandHtml(template.subject, template.buildHtml({
    customerName: params.customerName,
    orderId: params.orderId.slice(0, 8).toUpperCase(),
    trackingId: params.trackingId,
    trackingUrl: params.trackingUrl,
    shippingProvider: params.shippingProvider,
  }));

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: template.subject,
        html,
      }),
    });

    const result: { id?: string } = await res.json().catch(() => ({}));
    const success = res.ok && !!result.id;

    const notificationPayload: Record<string, unknown> = {
      order_id: params.orderId,
      type: params.type,
      provider: "email",
      status: success ? "sent" : "failed",
    };
    if (success) {
      notificationPayload.sent_at = new Date().toISOString();
      notificationPayload.provider_message_id = result.id ?? null;
    } else {
      notificationPayload.failure_reason = `Resend error ${res.status}`;
    }

    await supabase.from("order_notifications").insert(notificationPayload);
    if (!success) {
      console.error(`[email] Failed to send ${params.type} for order ${params.orderId}: HTTP ${res.status}`);
    }
  } catch (e) {
    console.error("[email] send failed:", e instanceof Error ? e.message : "unknown");
  }
}

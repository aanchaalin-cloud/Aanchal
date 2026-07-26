/**
 * WhatsApp / Notification Integration Abstraction
 *
 * This module defines clean integration points for sending transactional
 * notifications via WhatsApp Business API or other providers.
 *
 * No provider is hardcoded. The actual provider must be configured via
 * environment variables.
 *
 * To integrate a provider:
 * 1. Create a new file in src/lib/notifications/ (e.g., meta.ts, gupshup.ts)
 * 2. Implement the NotificationProvider interface
 * 3. Add the provider case to getNotificationProvider()
 */

export type NotificationMessage = {
  to: string; // Phone number in E.164 format (e.g., +918949911242)
  templateName: string;
  languageCode?: string;
  parameters: Array<{
    type: "text" | "image" | "document";
    text?: string;
    image?: { link: string };
    document?: { link: string; filename: string };
  }>;
};

export type NotificationSendResult = {
  success: boolean;
  providerMessageId?: string;
  error?: string;
};

export type NotificationType =
  | "order_confirmed"
  | "order_shipped"
  | "tracking_info"
  | "delivery_day"
  | "order_delivered";

export interface NotificationProvider {
  name: string;

  /** Send a template message */
  sendTemplate(message: NotificationMessage): Promise<NotificationSendResult>;

  /** Verify webhook signature if supported */
  verifyWebhookSignature?(payload: string, signature: string): boolean;
}

/**
 * Get the configured notification provider.
 * Returns null if no provider is configured.
 */
export function getNotificationProvider(): NotificationProvider | null {
  const providerName = process.env.NOTIFICATION_PROVIDER;

  if (!providerName) return null;

  // Provider integration examples (implement as needed):
  // switch (providerName) {
  //   case "meta":
  //     return new MetaWhatsAppProvider();
  //   case "gupshup":
  //     return new GupshupProvider();
  //   case "twilio":
  //     return new TwilioProvider();
  //   default:
  //     console.warn(`Unknown notification provider: ${providerName}`);
  //     return null;
  // }

  console.warn(
    `[notifications] Provider "${providerName}" is not yet implemented. ` +
    `Create a provider class in src/lib/notifications/ and add it to getNotificationProvider().`
  );
  return null;
}

/**
 * Message templates for each notification type.
 * These are placeholder templates. Configure the actual template names
 * in your WhatsApp Business API provider dashboard.
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationType, {
  templateName: string;
  getMessage: (params: {
    customerName: string;
    orderId: string;
    trackingId?: string;
    trackingUrl?: string;
    shippingProvider?: string;
    estimatedDelivery?: string;
  }) => string;
}> = {
  order_confirmed: {
    templateName: "aanchal_order_confirmed",
    getMessage: ({ customerName, orderId }) =>
      `Hi ${customerName} 🤍\n\nYour Aanchal order is confirmed!\nWe're now getting your custom-fit piece ready, made especially for you.\n\nOrder: #${orderId.slice(0, 8)}\n\nWe'll keep you updated every step of the way.\n\nWith love,\nTeam Aanchal`,
  },
  order_shipped: {
    templateName: "aanchal_order_shipped",
    getMessage: ({ customerName, orderId, trackingId, shippingProvider }) =>
      `Hi ${customerName} 🤍\n\nGreat news! Your Aanchal order #${orderId.slice(0, 8)} has been shipped.\n\n${trackingId ? `Tracking: ${trackingId}` : ""}${shippingProvider ? `\nCarrier: ${shippingProvider}` : ""}\n\nWe'll notify you when it's out for delivery.\n\nWith love,\nTeam Aanchal`,
  },
  tracking_info: {
    templateName: "aanchal_tracking_info",
    getMessage: ({ customerName, orderId, trackingId, trackingUrl }) =>
      `Hi ${customerName} 🤍\n\nHere's the latest tracking info for your Aanchal order #${orderId.slice(0, 8)}:\n\n${trackingId ? `Tracking ID: ${trackingId}` : ""}${trackingUrl ? `\nTrack here: ${trackingUrl}` : ""}\n\nWith love,\nTeam Aanchal`,
  },
  delivery_day: {
    templateName: "aanchal_delivery_day",
    getMessage: ({ customerName, orderId }) =>
      `Hi ${customerName} 🤍\n\nExciting! Your Aanchal order #${orderId.slice(0, 8)} is out for delivery today.\n\nPlease keep your ID ready for verification.\n\nWith love,\nTeam Aanchal`,
  },
  order_delivered: {
    templateName: "aanchal_order_delivered",
    getMessage: ({ customerName, orderId }) =>
      `Hi ${customerName} 🤍\n\nYour Aanchal order #${orderId.slice(0, 8)} has been delivered!\n\nWe hope you love your new custom-fit piece. If you do, we'd be honoured if you shared a review or social post.\n\nWith love,\nTeam Aanchal`,
  },
};

/**
 * Send a notification for an order status change.
 * Uses idempotency via the order_notifications table.
 */
export async function sendOrderNotification(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createServiceClient> extends Promise<infer T> ? T : never,
  params: {
    orderId: string;
    customerPhone: string;
    type: NotificationType;
    customerName: string;
    trackingId?: string;
    trackingUrl?: string;
    shippingProvider?: string;
    estimatedDelivery?: string;
  }
): Promise<void> {
  const provider = getNotificationProvider();
  if (!provider) {
    console.info(`[notifications] No provider configured. Skipping ${params.type} for order ${params.orderId.slice(0, 8)}`);
    return;
  }

  // Idempotency: check if notification already sent
  const { data: existing } = await supabase
    .from("order_notifications")
    .select("id, status")
    .eq("order_id", params.orderId)
    .eq("type", params.type)
    .eq("status", "sent")
    .maybeSingle();

  if (existing) {
    console.info(`[notifications] ${params.type} already sent for order ${params.orderId.slice(0, 8)}`);
    return;
  }

  const template = NOTIFICATION_TEMPLATES[params.type];

  const result = await provider.sendTemplate({
    to: params.customerPhone,
    templateName: template.templateName,
    languageCode: "en",
    parameters: [
      { type: "text", text: template.getMessage({
        customerName: params.customerName,
        orderId: params.orderId,
        trackingId: params.trackingId,
        trackingUrl: params.trackingUrl,
        shippingProvider: params.shippingProvider,
        estimatedDelivery: params.estimatedDelivery,
      })},
    ],
  });

  // Record notification
  const notificationPayload: Record<string, unknown> = {
    order_id: params.orderId,
    customer_phone: params.customerPhone,
    type: params.type,
    provider: provider.name,
    status: result.success ? "sent" : "failed",
  };

  if (result.providerMessageId) notificationPayload.provider_message_id = result.providerMessageId;
  if (result.error) notificationPayload.failure_reason = result.error;
  if (result.success) notificationPayload.sent_at = new Date().toISOString();

  const { error } = await supabase.from("order_notifications").insert(notificationPayload);
  if (error) {
    console.warn(`[notifications] Failed to record notification: ${error.message}`);
  }
}

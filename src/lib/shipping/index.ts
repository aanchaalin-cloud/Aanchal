/**
 * Shipping Integration Abstraction
 *
 * Defines the integration point for shipping providers.
 * No provider is hardcoded. The actual provider is selected at runtime via
 * the SHIPPING_PROVIDER environment variable.
 */

import { ShiprocketProvider } from "./shiprocket";

export type ShipmentCreateRequest = {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  codAmount: number;
  declaredValue: number;
  items: Array<{
    name: string;
    quantity: number;
    sku?: string;
  }>;
};

export type ShipmentCreateResponse = {
  trackingId: string;
  trackingUrl?: string;
  provider: string;
  awbNumber?: string;
  /** Provider's numeric shipment ID (used for cancel / label endpoints). */
  providerShipmentId?: string;
  labelUrl?: string;
};

export type ShipmentTrackEvent = {
  status: string;
  currentStatus: string;
  location: string | null;
  datetime: string | null;
};

export type ShipmentTrackingInfo = {
  awbCode: string;
  shipmentId: string | null;
  trackingStatus: string | null;
  etd: string | null;
  events: ShipmentTrackEvent[];
  /** Mapped customer-facing order status, or null when unknown/unmapped. */
  mappedOrderStatus: string | null;
};

export type ShipmentCancelResult = { success: boolean; error?: string };

export interface ShippingProvider {
  name: string;

  /** Create a shipment and get tracking */
  createShipment(request: ShipmentCreateRequest): Promise<ShipmentCreateResponse>;

  /** Fetch live tracking info for an AWB / shipment (best-effort). */
  trackShipment?(awbCode: string, shipmentId?: string): Promise<ShipmentTrackingInfo | null>;

  /** Cancel a created shipment before dispatch (best-effort). */
  cancelShipment?(shipmentId: string): Promise<ShipmentCancelResult>;

  /** Generate a shipping label for a shipment, returning the label URL. */
  generateLabel?(shipmentId: string): Promise<string | null>;

  /** Verify webhook signature if supported */
  verifyWebhookSignature?(payload: string, signature: string): boolean;
}

/**
 * Get the configured shipping provider.
 * Returns null if no provider is configured.
 */
export function getShippingProvider(): ShippingProvider | null {
  const providerName = process.env.SHIPPING_PROVIDER;

  if (!providerName) return null;

  switch (providerName.toLowerCase()) {
    case "shiprocket":
      return new ShiprocketProvider();
    default:
      console.warn(`Unknown shipping provider: ${providerName}`);
      return null;
  }
}

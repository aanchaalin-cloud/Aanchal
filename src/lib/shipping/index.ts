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
  labelUrl?: string;
};

export interface ShippingProvider {
  name: string;

  /** Create a shipment and get tracking */
  createShipment(request: ShipmentCreateRequest): Promise<ShipmentCreateResponse>;

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

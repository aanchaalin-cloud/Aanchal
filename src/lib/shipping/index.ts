/**
 * Shipping Integration Abstraction
 *
 * This module defines clean integration points for shipping providers.
 * No provider is hardcoded. The actual provider must be configured via
 * environment variables and selected at runtime.
 *
 * To integrate a provider:
 * 1. Create a new file in src/lib/shipping/ (e.g., nimbuspost.ts)
 * 2. Implement the ShippingProvider interface
 * 3. Add the provider case to getShippingProvider()
 */

export type ShippingQuoteRequest = {
  originPincode: string;
  destinationPincode: string;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  codAmount?: number;
  declaredValue?: number;
};

export type ShippingQuote = {
  provider: string;
  serviceType: string;
  cost: number;
  currency: "INR";
  estimatedDays: number;
  codAvailable: boolean;
  partialCodAvailable: boolean;
};

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

export type ShipmentTrackingUpdate = {
  trackingId: string;
  status: string;
  location?: string;
  timestamp: string;
  rawStatus: string;
};

export interface ShippingProvider {
  name: string;

  /** Get shipping cost estimate */
  getQuote(request: ShippingQuoteRequest): Promise<ShippingQuote>;

  /** Create a shipment and get tracking */
  createShipment(request: ShipmentCreateRequest): Promise<ShipmentCreateResponse>;

  /** Get latest tracking updates */
  getTracking(trackingId: string): Promise<ShipmentTrackingUpdate[]>;

  /** Verify webhook signature if supported */
  verifyWebhookSignature?(payload: string, signature: string): boolean;
}

/**
 * Get the configured shipping provider.
 * Returns null if no provider is configured.
 *
 * To add a provider:
 * - Add a case here
 * - Set SHIPPING_PROVIDER env var to the provider name
 */
export function getShippingProvider(): ShippingProvider | null {
  const providerName = process.env.SHIPPING_PROVIDER;

  if (!providerName) return null;

  // Provider integration examples (implement as needed):
  // switch (providerName) {
  //   case "nimbuspost":
  //     return new NimbusPostProvider();
  //   case "shipyaari":
  //     return new ShipyaariProvider();
  //   case "pickrr":
  //     return new PickrrProvider();
  //   case "delhivery":
  //     return new DelhiveryProvider();
  //   default:
  //     console.warn(`Unknown shipping provider: ${providerName}`);
  //     return null;
  // }

  console.warn(
    `[shipping] Provider "${providerName}" is not yet implemented. ` +
    `Create a provider class in src/lib/shipping/ and add it to getShippingProvider().`
  );
  return null;
}

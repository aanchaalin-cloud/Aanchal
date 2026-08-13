import "server-only";

import crypto from "node:crypto";
import { timingSafeEqualUtf8 } from "@/lib/crypto";

/**
 * Paytm Payment Gateway integration.
 *
 * Flow:
 *  1. initiateTransaction() -> txnToken
 *  2. Redirect the browser to the processTransaction URL (see redirectUrl)
 *  3. Paytm POSTs form params + CHECKSUMHASH to the callback URL
 *  4. verifyCallbackChecksum() validates the callback server-side
 *  5. getTransactionStatus() re-confirms via the status API (never trust
 *     the browser callback alone)
 *
 * Secrets (PAYTM_MERCHANT_KEY) are server-side only and never exposed.
 */

const PAYTM_UAT_BASE_URL = "https://securegw-stage.paytm.in";
const PAYTM_PROD_BASE_URL = "https://securegw.paytm.in";

export type PaytmConfig = {
  mid: string;
  merchantKey: string;
  websiteName: string;
  baseUrl: string;
  callbackUrl: string;
};

export function getPaytmConfig(): PaytmConfig | null {
  const mid = process.env.PAYTM_MID;
  const merchantKey = process.env.PAYTM_MERCHANT_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!mid || !merchantKey || !appUrl) return null;

  const isProduction = process.env.PAYTM_ENV === "production";
  const baseUrl =
    process.env.PAYTM_GATEWAY_BASE_URL ??
    (isProduction ? PAYTM_PROD_BASE_URL : PAYTM_UAT_BASE_URL);

  return {
    mid,
    merchantKey,
    websiteName: process.env.PAYTM_WEBSITE_NAME ?? (isProduction ? "WEB" : "WEBSTAGING"),
    baseUrl,
    callbackUrl: `${appUrl}/api/webhook/paytm`,
  };
}

/**
 * Paytm checksum (official algorithm):
 *   base64( sha256( data + merchantKey ) )
 */
export function generateSignature(data: string, merchantKey: string): string {
  const hash = crypto.createHash("sha256").update(data + merchantKey).digest();
  return Buffer.from(hash).toString("base64");
}

/**
 * Verify the checksum of a request body (exact bytes that were sent).
 */
export function verifySignature(data: string, merchantKey: string, provided: string): boolean {
  if (!provided) return false;
  const expected = generateSignature(data, merchantKey);
  // Compare the base64 signature strings in a timing-safe manner
  return timingSafeEqualUtf8(expected, provided);
}

/**
 * Verify a callback's CHECKSUMHASH over sorted form params.
 * Paytm signs the sorted list of non-empty params (excluding CHECKSUMHASH),
 * joined as `KEY=value&KEY2=value2` — field names are uppercase.
 */
export function verifyCallbackChecksum(
  params: Record<string, string>,
  merchantKey: string,
  providedChecksum: string | null
): boolean {
  if (!providedChecksum) return false;
  const data = Object.keys(params)
    .filter((key) => key !== "CHECKSUMHASH" && params[key] !== "" && params[key] != null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return verifySignature(data, merchantKey, providedChecksum);
}

/**
 * Build a Paytm order ID from a local order UUID.
 * Paytm charset: [A-Za-z0-9_@-], max 50 chars, single-use per attempt.
 * `attempt` lets a retry create a fresh Paytm order for the same local order.
 */
export function buildPaytmOrderId(orderId: string, attempt = 1): string {
  const hex = orderId.replace(/-/g, "");
  return `AANCHAL-${hex}-${attempt}`;
}

// ------------------------------------------------------------------
// Initiate Transaction
// ------------------------------------------------------------------

export type InitiateTransactionParams = {
  paytmOrderId: string;
  amountPaise: number;
  customerId: string;
  mobileNumber?: string;
  email?: string;
};

export type InitiateTransactionResult = {
  success: boolean;
  txnToken?: string;
  resultStatus?: string;
  resultCode?: string;
  resultMsg?: string;
};

export async function initiateTransaction(
  config: PaytmConfig,
  params: InitiateTransactionParams
): Promise<InitiateTransactionResult> {
  const body = {
    requestType: "Payment",
    mid: config.mid,
    websiteName: config.websiteName,
    orderId: params.paytmOrderId,
    txnAmount: {
      value: (params.amountPaise / 100).toFixed(2),
      currency: "INR",
    },
    userInfo: {
      custId: params.customerId,
      ...(params.mobileNumber ? { mobile: params.mobileNumber } : {}),
      ...(params.email ? { email: params.email } : {}),
    },
    callbackUrl: config.callbackUrl,
  };

  const bodyJson = JSON.stringify(body);
  const signature = generateSignature(bodyJson, config.merchantKey);
  const payload = JSON.stringify({ head: { signature }, body });

  const res = await fetch(
    `${config.baseUrl}/theia/api/v1/initiateTransaction?mid=${config.mid}&orderId=${params.paytmOrderId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      cache: "no-store",
    }
  );

  const json = await res.json().catch(() => null);
  const resultInfo = json?.body?.resultInfo;

  if (!res.ok || !json?.body?.txnToken) {
    return {
      success: false,
      resultStatus: resultInfo?.resultStatus ?? "F",
      resultCode: resultInfo?.resultCode ?? "400",
      resultMsg: resultInfo?.resultMsg ?? json?.body?.resultMsg ?? "Payment could not be initiated",
    };
  }

  return {
    success: true,
    txnToken: json.body.txnToken,
    resultStatus: resultInfo?.resultStatus,
    resultCode: resultInfo?.resultCode,
    resultMsg: resultInfo?.resultMsg,
  };
}

/** Redirect URL that opens the Paytm payment page. */
export function getProcessTransactionUrl(config: PaytmConfig, paytmOrderId: string, txnToken: string): string {
  return `${config.baseUrl}/theia/processTransaction?orderId=${encodeURIComponent(paytmOrderId)}&token=${encodeURIComponent(txnToken)}`;
}

// ------------------------------------------------------------------
// Transaction Status (server-side re-confirmation)
// ------------------------------------------------------------------

export type TransactionStatus = {
  success: boolean;
  resultStatus?: string;
  resultCode?: string;
  resultMsg?: string;
  orderId?: string;
  txnId?: string;
  txnAmount?: string;
  bankTxnId?: string;
};

export async function getTransactionStatus(
  config: PaytmConfig,
  paytmOrderId: string
): Promise<TransactionStatus> {
  const body = { mid: config.mid, orderId: paytmOrderId };
  const bodyJson = JSON.stringify(body);
  const signature = generateSignature(bodyJson, config.merchantKey);
  const payload = JSON.stringify({ head: { signature }, body });

  const res = await fetch(`${config.baseUrl}/theia/api/v1/transactionStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  const resultInfo = json?.body?.resultInfo;

  if (!res.ok || !resultInfo) {
    return {
      success: false,
      resultCode: resultInfo?.resultCode ?? "400",
      resultMsg: resultInfo?.resultMsg ?? "Payment status could not be checked",
    };
  }

  return {
    success: true,
    resultStatus: resultInfo.resultStatus,
    resultCode: resultInfo.resultCode,
    resultMsg: resultInfo.resultMsg,
    orderId: json.body.orderId,
    txnId: json.body.txnId,
    txnAmount: json.body.txnAmount,
    bankTxnId: json.body.bankTxnId,
  };
}

/** Rupee-string amount from Paytm ("1299.00") to paise integer. */
export function paytmAmountToPaise(amount: string): number {
  return Math.round(Number(amount) * 100);
}

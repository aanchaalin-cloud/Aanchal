import "server-only";

import crypto from "node:crypto";
import { timingSafeEqualUtf8 } from "@/lib/crypto";
import { warn } from "@/lib/logger";

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
 * Verify a Paytm API response's `head.signature` over its own `body`.
 *
 * Paytm signs the serialized body (exact key order as received), so the raw
 * response text is parsed once and the body re-serialized for verification.
 *
 * Returns:
 *   true  — signature present and valid
 *   false — signature present but INVALID (tampered / broken response)
 *   null  — no signature present (transport is HTTPS; warn-and-continue)
 *
 * Callers fail closed when a signature is present but invalid.
 */
export function verifyResponseSignature(
  rawText: string,
  merchantKey: string
): boolean | null {
  let json: { head?: { signature?: string }; body?: unknown } | null = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    return null;
  }
  const signature = json?.head?.signature;
  if (!signature) return null;
  if (json?.body === undefined) return false;
  return verifySignature(JSON.stringify(json.body), merchantKey, signature);
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

  const rawText = await res.text();
  let json: { body?: { txnToken?: string; resultInfo?: { resultStatus?: string; resultCode?: string; resultMsg?: string }; resultMsg?: string } } | null = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = null;
  }

  const responseSigOk = verifyResponseSignature(rawText, config.merchantKey);
  if (responseSigOk === false) {
    warn("Initiate transaction response signature invalid", { paytmOrderId: params.paytmOrderId });
  }

  const resultInfo = json?.body?.resultInfo;

  if (!res.ok || !json?.body?.txnToken || responseSigOk === false) {
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

  const rawText = await res.text();
  let json: {
    body?: {
      resultInfo?: { resultStatus?: string; resultCode?: string; resultMsg?: string };
      orderId?: string;
      txnId?: string;
      txnAmount?: string;
      bankTxnId?: string;
    };
  } | null = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = null;
  }

  // Fail closed if the status response carries an invalid signature — the
  // status API is the server-authoritative re-confirmation, so a tampered
  // response must never be trusted.
  const responseSigOk = verifyResponseSignature(rawText, config.merchantKey);
  if (responseSigOk === false) {
    warn("Transaction status response signature invalid", { paytmOrderId });
  }

  const resultInfo = json?.body?.resultInfo;

  if (!res.ok || !resultInfo || responseSigOk === false || !json?.body) {
    return {
      success: false,
      resultCode: resultInfo?.resultCode ?? "400",
      resultMsg: resultInfo?.resultMsg ?? "Payment status could not be checked",
    };
  }

  const responseBody = json.body;
  return {
    success: true,
    resultStatus: resultInfo.resultStatus,
    resultCode: resultInfo.resultCode,
    resultMsg: resultInfo.resultMsg,
    orderId: responseBody.orderId,
    txnId: responseBody.txnId,
    txnAmount: responseBody.txnAmount,
    bankTxnId: responseBody.bankTxnId,
  };
}

/** Rupee-string amount from Paytm ("1299.00") to paise integer. */
export function paytmAmountToPaise(amount: string): number {
  return Math.round(Number(amount) * 100);
}

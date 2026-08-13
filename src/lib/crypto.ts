import crypto from "node:crypto";

/**
 * Compute HMAC hex digest using the given algorithm (default: sha256).
 */
export function hmacHex(secret: string, data: string, algorithm = "sha256"): string {
  return crypto.createHmac(algorithm, secret).update(data).digest("hex");
}

/**
 * Timing-safe comparison of two hex strings. Returns false for invalid input lengths or non-hex strings.
 */
export function timingSafeEqualHex(expectedHex: string, providedHex: string): boolean {
  if (!/^[a-f0-9]{2,}$/i.test(expectedHex) || !/^[a-f0-9]{2,}$/i.test(providedHex)) return false;
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const provided = Buffer.from(providedHex, "hex");
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

/**
 * Timing-safe comparison of two UTF-8 strings (useful for base64 or raw text digests).
 */
export function timingSafeEqualUtf8(expected: string, provided: string): boolean {
  if (typeof expected !== "string" || typeof provided !== "string" || expected.length === 0 || provided.length === 0) return false;
  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(provided, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

"use client";

import { useRef, useState } from "react";
import { Check, Copy, MessageCircle, ExternalLink } from "lucide-react";

type Props = {
  message: string;
  whatsappUrl: string;
  whatsappNumber: string;
  orderNumber: string | null;
};

/**
 * Phase 1 WhatsApp confirmation card.
 *
 * The order is already created server-side and is awaiting manual confirmation.
 * This card shows the prepared message and lets the customer open WhatsApp or
 * copy the message if WhatsApp cannot be opened (the order is never lost — it
 * already exists in the database).
 */
export default function WhatsAppConfirmationCard({
  message,
  whatsappUrl,
  whatsappNumber,
  orderNumber,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // Clipboard API unavailable — fall back to selecting the message text.
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.select();
        try {
          document.execCommand("copy");
        } catch {
          // Nothing more we can do — the text is visible for manual selection.
        }
        setCopied(true);
      }
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-8 overflow-hidden rounded-sm border border-[#E5D5C5]/50 bg-white text-left">
      <div className="border-b border-[#E5D5C5]/50 bg-[#FFF0E8] px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1C1C1C]">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          Confirm your order on WhatsApp
        </h2>
        <p className="mt-1 text-xs text-[#6B6B6B]">
          Your order request {orderNumber ? `(${orderNumber}) ` : ""}is prepared.
          Send the message below and we&apos;ll confirm your order — payment will
          be arranged separately.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <textarea
          ref={textareaRef}
          readOnly
          rows={14}
          value={message}
          aria-label="Prepared WhatsApp message"
          className="w-full resize-none rounded-sm border border-[#E5D5C5] bg-[#FAFAF7] px-3 py-2 text-xs leading-relaxed text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1EBE5A] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center justify-center gap-2 rounded border border-[#E5D5C5] bg-white px-5 py-3 text-sm font-medium text-[#1C1C1C] hover:border-[#95271D]/50 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Message"}
            </button>
          </div>
        </div>

        <p className="text-xs text-[#6B6B6B]">
          If WhatsApp doesn&apos;t open, copy the message above and send it to{" "}
          <span className="font-medium text-[#1C1C1C]">+{whatsappNumber}</span>{" "}
          manually. Your order is already saved with us and is awaiting confirmation.
        </p>
      </div>
    </div>
  );
}

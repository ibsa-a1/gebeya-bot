import { Injectable, BadGatewayException } from "@nestjs/common";

const CHAPA_INITIALIZE_URL = "https://api.chapa.co/v1/transaction/initialize";
const CHAPA_VERIFY_URL = "https://api.chapa.co/v1/transaction/verify";

interface ChapaInitializeResult {
  checkoutUrl: string;
  txRef: string;
}

@Injectable()
export class ChapaProvider {
  async initialize(params: {
    secretKey: string;
    amount: number;
    currency: string;
    txRef: string;
    returnUrl: string;
    callbackUrl: string;
    customerTelegramId: string;
  }): Promise<ChapaInitializeResult> {
    const response = await fetch(CHAPA_INITIALIZE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amount.toString(),
        currency: params.currency,
        tx_ref: params.txRef,
        return_url: params.returnUrl,
        // Without this, Chapa has no address to POST payment-status webhooks
        // to — it was missing entirely before, which is why no webhook was
        // ever received despite payments completing successfully.
        callback_url: params.callbackUrl,
        customization: { title: "Gebeya Bot Order" },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
      throw new BadGatewayException(
        `Chapa payment initialization failed: ${data.message ?? "Unknown error"}`,
      );
    }

    return {
      checkoutUrl: data.data.checkout_url,
      txRef: params.txRef,
    };
  }

  /**
   * Fallback for when Chapa's webhook doesn't arrive (a real, observed gap
   * in their sandbox environment — confirmed via their own dashboard showing
   * successful payments with zero corresponding webhook delivery). Actively
   * asks Chapa for a transaction's current status instead of waiting to be
   * told. Returns Chapa's raw "status" field verbatim — the caller decides
   * what counts as success.
   */
  async verify(secretKey: string, txRef: string): Promise<{ status: string; raw: unknown }> {
    const response = await fetch(`${CHAPA_VERIFY_URL}/${txRef}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new BadGatewayException(
        `Chapa verify failed: ${data.message ?? "Unknown error"}`,
      );
    }

    return { status: data.data?.status ?? "unknown", raw: data };
  }
}

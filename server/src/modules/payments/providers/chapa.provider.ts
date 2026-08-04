import { Injectable, BadGatewayException } from "@nestjs/common";

const CHAPA_INITIALIZE_URL = "https://api.chapa.co/v1/transaction/initialize";

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
}

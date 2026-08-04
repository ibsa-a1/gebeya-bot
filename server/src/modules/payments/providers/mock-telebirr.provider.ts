import { Injectable } from "@nestjs/common";

/**
 * MOCK ONLY — no real Telebirr integration exists. This simulates the shape
 * of what a real integration would look like (initialize → async webhook
 * confirms payment) purely for demo/development purposes. Per
 * PRODUCT_REQUIREMENTS.md's explicit edge cases, this must never be
 * presented anywhere as a genuine Telebirr connection.
 */
@Injectable()
export class MockTelebirrProvider {
  initialize(params: { txRef: string; webhookCallback: () => Promise<unknown> }): {
    mockCheckoutRef: string;
  } {
    // Simulates the delay of a real payment provider, then self-invokes
    // the same webhook path a real provider would call asynchronously.
    setTimeout(() => {
      params.webhookCallback().catch((err) => {
        console.error("Mock Telebirr webhook simulation failed:", err);
      });
    }, 2000);

    return { mockCheckoutRef: params.txRef };
  }
}

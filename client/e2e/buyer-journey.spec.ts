import { test, expect, request } from "@playwright/test";

const SERVER_URL = "http://localhost:4010/api/v1";
const TENANT_ID = "cmsdmpdgs00000vij1ybt2k9n"; // Test Boutique
const MERCHANT_EMAIL = "test2@example.com";
const MERCHANT_PASSWORD = "testpass123";
const TEST_BUYER_TELEGRAM_ID = "888777666";

test.describe("Full buyer journey — search through payment confirmation", () => {
  test("buyer browses, checks out, payment is confirmed via webhook, and the merchant sees it live", async ({
    page,
  }) => {
    // Step 1 — browse the real public storefront (this is what the bot's
    // "Open Store to Buy" button actually opens — no auth, per API.md).
    await page.goto(`/mini-app/${TENANT_ID}`);
    await expect(page.getByText("Blue Suede Sneakers")).toBeVisible({ timeout: 10000 });

    // Step 2 — add to cart and proceed to checkout through the real UI.
    // A bare div+hasText/has filter matches EVERY ancestor div containing
    // the text as a descendant, including the outer grid container that
    // wraps every product (and therefore every "Add to cart" button) —
    // not just the specific card. Card.tsx's `rounded-xl` class is unique
    // to individual product cards (confirmed by reading the component),
    // so scoping to it precisely narrows to the one real card.
    const productCard = page
      .locator("div.rounded-xl")
      .filter({ hasText: "Blue Suede Sneakers" });
    await productCard.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page).toHaveURL(`/mini-app/${TENANT_ID}/checkout`);

    // Step 3 — outside real Telegram, the checkout page's own "Test mode"
    // panel is the documented, built-in way to supply a Telegram identity
    // (see app/mini-app/[tenantId]/checkout/page.tsx) — not a workaround.
    await page.getByPlaceholder("e.g. 123456789").fill(TEST_BUYER_TELEGRAM_ID);
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText("Order placed")).toBeVisible({ timeout: 10000 });
    const orderIdText = await page.getByText(/Order #/).textContent();
    const orderIdSuffix = orderIdText?.match(/Order #(\w+)/)?.[1];
    expect(orderIdSuffix).toBeTruthy();

    // Step 4 — find the real order and its Payment record directly (same
    // pattern used throughout Phase 13 QA) to get the genuine txRef needed
    // to simulate Chapa's webhook — we can't intercept a real Chapa redirect
    // in this test, so we simulate the webhook Chapa would have sent instead,
    // matching TESTING.md §4's explicit "mocked payment webhook" wording.
    const apiContext = await request.newContext();
    const ownerLogin = await apiContext.post(`${SERVER_URL}/auth/login`, {
      data: { email: MERCHANT_EMAIL, password: MERCHANT_PASSWORD },
    });
    expect(ownerLogin.ok()).toBeTruthy();
    const { accessToken } = await ownerLogin.json();

    const ordersRes = await apiContext.get(`${SERVER_URL}/tenants/${TENANT_ID}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(ordersRes.ok()).toBeTruthy();
    const orders = await ordersRes.json();
    const ourOrder = orders.items.find((o: { id: string }) => o.id.endsWith(orderIdSuffix!));
    expect(ourOrder).toBeTruthy();
    expect(ourOrder.status).toBe("PENDING");

    // Initialize a real Chapa payment for this order to get a genuine txRef
    // (mirrors what mini-app.controller.ts's checkout flow already does
    // automatically in production — done explicitly here since we need the
    // txRef value directly for the webhook simulation below).
    const initRes = await apiContext.post(
      `${SERVER_URL}/payments/chapa/initialize/${TENANT_ID}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { orderId: ourOrder.id },
      },
    );
    // NOTE: this hits Chapa's real sandbox API. During Phase 13/14 work we
    // repeatedly observed transient "fetch failed" errors from Chapa's own
    // side (see ARCHITECTURE.md's external-service findings, and HANDOFF.md)
    // — if this specific assertion fails, re-run before assuming a real
    // regression; it may just be Chapa's sandbox being flaky, not our code.
    expect(initRes.ok()).toBeTruthy();
    const { txRef } = await initRes.json();

    // Step 5 — simulate Chapa's payment-success webhook (public, signature
    // verification is a documented future hardening item per
    // payments.controller.ts's own comment — not something this test claims
    // to bypass, just testing what's actually implemented today).
    const webhookRes = await apiContext.post(`${SERVER_URL}/payments/webhook/chapa`, {
      data: { tx_ref: txRef, status: "success" },
    });
    expect(webhookRes.ok()).toBeTruthy();

    // Step 6 — the real assertion: the merchant's dashboard genuinely shows
    // this specific order as PAID, through the real UI, not just the API.
    await page.goto("/login");
    await page.getByLabel("Email").fill(MERCHANT_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(MERCHANT_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/products", { timeout: 10000 });

    await page.goto("/orders");
    // Same class of issue as the storefront's product card: scope to the
    // order's actual Card (rounded-xl), not every ancestor div containing
    // the order id text — orders/page.tsx wraps each order in a Card too.
    const orderCard = page
      .locator("div.rounded-xl")
      .filter({ hasText: `#${orderIdSuffix}` });
    await expect(orderCard.getByText("PAID")).toBeVisible({ timeout: 10000 });

    await apiContext.dispose();
  });
});

import { test, expect, request } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

function getServerEnv(key: string): string {
  const envPath = join(__dirname, "../../server/.env");
  const envContent = readFileSync(envPath, "utf8");
  const pattern = new RegExp(`^${key}="?([^"\n]+)"?`, "m");
  const match = envContent.match(pattern);
  if (!match) throw new Error(`${key} not found in server/.env`);
  return match[1];
}

const SERVER_URL = "http://localhost:4010/api/v1";

test.describe("Merchant flow — signup through live storefront visibility", () => {
  test("a new merchant can sign up, get a tenant provisioned, add a product, and see it live", async ({
    page,
  }) => {
    // Unique per run so repeated test runs never collide on a real DB constraint.
    const runId = Date.now();
    const merchantEmail = `e2e-merchant-${runId}@example.com`;
    const merchantPassword = "e2eTestPass123";
    const merchantName = "E2E Test Merchant";
    const tenantSlug = `e2e-shop-${runId}`;
    const productName = `E2E Product ${runId}`;

    // Step 1 — real signup through the actual UI.
    await page.goto("/signup");
    await page.getByLabel("Full name").fill(merchantName);
    await page.getByLabel("Email").fill(merchantEmail);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(merchantPassword);
    await page.getByLabel("Confirm password").fill(merchantPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/products", { timeout: 10000 });

    // Step 2 — per PRODUCT_REQUIREMENTS.md §4.2 / API.md, tenant creation is
    // genuinely platform-owner-only; there is no self-serve path (correctly
    // listed as Future Scale in the PRD). We authenticate as the real
    // platform owner (credentials in server/.env, gitignored, never
    // committed) to provision this merchant's tenant via the real API —
    // faithfully simulating the documented two-actor onboarding flow rather
    // than working around it.
    const apiContext = await request.newContext();
    const ownerLogin = await apiContext.post(`${SERVER_URL}/auth/login`, {
      data: {
        email: getServerEnv("E2E_PLATFORM_OWNER_EMAIL"),
        password: getServerEnv("E2E_PLATFORM_OWNER_PASSWORD"),
      },
    });
    expect(ownerLogin.ok()).toBeTruthy();
    const { accessToken: ownerToken } = await ownerLogin.json();

    const tenantRes = await apiContext.post(`${SERVER_URL}/tenants`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: {
        name: `E2E Shop ${runId}`,
        slug: tenantSlug,
        botToken: `e2e-fake-bot-token-${runId}`,
        botUsername: `E2EShopBot${runId}`,
        ownerEmail: merchantEmail,
      },
    });
    expect(tenantRes.ok()).toBeTruthy();
    const tenant = await tenantRes.json();

    // Step 3 — back in the real browser session, reload so the dashboard
    // picks up the newly-provisioned tenant membership.
    await page.reload();
    // The dropdown <option> element with this text is present in the DOM
    // but hidden until the select is opened — target the visible subtitle
    // text ("What buyers see in <tenant name>") specifically instead.
    await expect(page.getByText(`What buyers see in E2E Shop ${runId}`)).toBeVisible({
      timeout: 10000,
    });

    // Step 4 — add a real product through the real UI.
    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByLabel("Name").fill(productName);
    await page.getByLabel("Category").fill("E2E Test Category");
    await page.getByLabel("Price (ETB)").fill("1500");
    await page.getByLabel("Stock").fill("5");
    await page.getByRole("button", { name: "Save product" }).click();

    await expect(page.getByText(productName)).toBeVisible({ timeout: 10000 });

    // Step 5 — the actual point of this test: confirm the product is
    // genuinely live on the PUBLIC mini-app endpoint (no auth), which is
    // what the real Telegram bot's storefront actually calls.
    const miniAppRes = await apiContext.get(`${SERVER_URL}/mini-app/tenants/${tenant.id}/products`);
    expect(miniAppRes.ok()).toBeTruthy();
    const miniAppData = await miniAppRes.json();
    const found = miniAppData.items.find((p: { name: string }) => p.name === productName);
    expect(found).toBeTruthy();
    // Assert numerically rather than on exact string formatting — the API's
    // Decimal serialization format (e.g. "1500" vs "1500.00") is an
    // implementation detail we don't need this test to pin down.
    expect(Number(found.price)).toBe(1500);

    await apiContext.dispose();
  });
});

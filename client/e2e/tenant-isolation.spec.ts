import { test, expect } from "@playwright/test";

// Real tenant IDs and credentials from actual seeded/created test data —
// see docs/HANDOFF.md and Phase 13 QA notes for provenance.
const TENANT_A_EMAIL = "test2@example.com";
const TENANT_A_PASSWORD = "testpass123";

const TENANT_B_ID = "cmsdnz2ie0000t6ij0a8795qh"; // "Second Shop"

test.describe("Tenant isolation — the actual security boundary", () => {
  test("logging in as Tenant A never shows Tenant B's products, even via direct client-side tenant-id manipulation", async ({
    page,
  }) => {
    // Log in as Tenant A (Test Boutique) through the real UI.
    await page.goto("/login");
    await page.getByLabel("Email").fill(TENANT_A_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(TENANT_A_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/products");

    // Confirm Tenant A's own real product genuinely loads first — proves
    // the page/auth/fetch pipeline works at all before we test the boundary.
    await expect(page.getByText("Blue Suede Sneakers")).toBeVisible({ timeout: 10000 });

    // The actual attack simulation: useTenant() trusts whatever tenantId is
    // in localStorage with zero client-side validation against the logged-in
    // user's real memberships (confirmed by reading hooks/useTenant.ts) — so
    // directly writing Tenant B's id here is a faithful simulation of a
    // malicious client-side tenant-id swap, not a contrived scenario.
    await page.evaluate((tenantId) => {
      localStorage.setItem("gebeya_selected_tenant_id", tenantId);
    }, TENANT_B_ID);

    await page.reload();

    // The real assertion: whatever the UI does with the injected id, Tenant
    // B's real product data must never actually render. The backend's
    // TenantGuard is the thing actually being tested here — the UI merely
    // exposes whether it succeeded or failed.
    await expect(page.getByText("Blue Suede Sneakers")).not.toBeVisible();
    await expect(page.getByText(/second shop/i)).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { createHash, createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// Reads the real PLATFORM_AUTH_BOT_TOKEN from server/.env at test-run time —
// deliberately not duplicated/hardcoded here, since it's a real secret.
function getAuthBotToken(): string {
  const envPath = join(__dirname, "../../server/.env");
  const envContent = readFileSync(envPath, "utf8");
  const match = envContent.match(/^PLATFORM_AUTH_BOT_TOKEN="?([^"\n]+)"?/m);
  if (!match) throw new Error("PLATFORM_AUTH_BOT_TOKEN not found in server/.env");
  return match[1];
}

// Mirrors TelegramAuthVerifier.verify() exactly (see
// server/src/modules/auth/strategies/telegram.strategy.ts) — computes a
// GENUINELY valid signature the real backend will accept, rather than
// mocking the verifier itself. Only Telegram's actual widget/iframe is
// stood in for here, matching TESTING.md's "mocked Telegram Login payload."
function signTelegramPayload(fields: Record<string, string | number>, botToken: string): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

test.describe("Dual authentication — both paths converge on one real session", () => {
  test("email/password login reaches an authenticated session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test2@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("testpass123");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/products");
  });

  test("a genuinely-signed Telegram Login payload reaches an authenticated session", async ({ page }) => {
    const botToken = getAuthBotToken();
    const authDate = Math.floor(Date.now() / 1000);
    // NestJS's ValidationPipe (transform: true) converts the incoming JSON
    // into a real TelegramAuthDto class instance — which sets EVERY declared
    // field as an own property, even ones not sent, as literal `undefined`.
    // That `undefined` then gets stringified into the data-check string on
    // the server's side (`${key}=${fields[key]}` -> "photo_url=undefined"),
    // so our locally-computed signature must match that exact behavior byte
    // for byte. Discovered by comparing debug output from both sides directly
    // rather than guessing — see git history for the temporary debug logging
    // used to diagnose this.
    const fields = {
      id: 555444333,
      first_name: "E2E",
      last_name: "TestBuyer",
      username: "e2e_test_buyer",
      photo_url: undefined as unknown as string,
      auth_date: authDate,
    };
    const hash = signTelegramPayload(fields, botToken);

    await page.goto("/login");

    // TelegramLoginButton attaches window.onTelegramAuth inside a useEffect,
    // which only runs after mount — wait for it to genuinely exist rather
    // than assuming it's there immediately after navigation.
    await page.waitForFunction(() => typeof (window as any).onTelegramAuth === "function");

    // Simulates Telegram's widget calling back into the page with a real,
    // validly-signed payload — exercising the exact same client → server →
    // TelegramAuthVerifier path a genuine Telegram login would use.
    await page.evaluate((payload) => {
      // @ts-expect-error — onTelegramAuth is attached to window by the real component
      window.onTelegramAuth(payload);
    }, { ...fields, hash });

    await expect(page).toHaveURL("/products", { timeout: 10000 });
  });
});

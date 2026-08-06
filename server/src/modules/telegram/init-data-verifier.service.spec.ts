import { UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import { InitDataVerifier } from "./init-data-verifier.service";

describe("InitDataVerifier", () => {
  let verifier: InitDataVerifier;
  const botToken = "test-bot-token-123";

  beforeEach(() => {
    verifier = new InitDataVerifier();
  });

  function buildValidInitData(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123456789, first_name: "Test" }),
      ...overrides,
    };

    const dataCheckString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return new URLSearchParams({ ...params, hash }).toString();
  }

  it("throws UnauthorizedException when the hash is missing entirely", () => {
    expect(() => verifier.verify("auth_date=123&user=%7B%7D", botToken)).toThrow(
      UnauthorizedException,
    );
  });

  it("throws UnauthorizedException when the signature doesn't match (tampered data)", () => {
    const initData = buildValidInitData();
    // Simulate an attacker changing the user id after the real signature was issued.
    const tampered = initData.replace(
      encodeURIComponent(JSON.stringify({ id: 123456789, first_name: "Test" })),
      encodeURIComponent(JSON.stringify({ id: 999999999, first_name: "Test" })),
    );
    expect(() => verifier.verify(tampered, botToken)).toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when signed with a DIFFERENT bot's token", () => {
    const initData = buildValidInitData();
    expect(() => verifier.verify(initData, "a-completely-different-bot-token")).toThrow(
      UnauthorizedException,
    );
  });

  it("throws UnauthorizedException when auth_date is too old (expired session)", () => {
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 90000); // >24h old
    const initData = buildValidInitData({ auth_date: staleTimestamp });
    expect(() => verifier.verify(initData, botToken)).toThrow(UnauthorizedException);
  });

  it("returns the real user data for a genuinely valid, correctly-signed initData", () => {
    const initData = buildValidInitData();
    const user = verifier.verify(initData, botToken);
    expect(user).toEqual({ id: 123456789, first_name: "Test" });
  });
});

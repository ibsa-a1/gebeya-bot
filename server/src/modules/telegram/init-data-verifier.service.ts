import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

interface VerifiedTelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

const MAX_INIT_DATA_AGE_SECONDS = 86400; // 24 hours

@Injectable()
export class InitDataVerifier {
  verify(initData: string, botToken: string): VerifiedTelegramUser {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      throw new UnauthorizedException("Missing hash in Telegram initData");
    }
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Mini App initData uses a DIFFERENT key derivation than the Login
    // Widget (Phase 3): secret_key = HMAC-SHA256(key="WebAppData", data=botToken),
    // not SHA256(botToken) directly. This is Telegram's own documented
    // algorithm, specific to Mini Apps.
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const isValid =
      computedHash.length === hash.length &&
      timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

    if (!isValid) {
      throw new UnauthorizedException("Invalid Telegram initData signature");
    }

    const authDate = Number(params.get("auth_date"));
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (!authDate || ageSeconds > MAX_INIT_DATA_AGE_SECONDS) {
      throw new UnauthorizedException("Telegram initData has expired");
    }

    const userRaw = params.get("user");
    if (!userRaw) {
      throw new UnauthorizedException("Missing user in Telegram initData");
    }

    try {
      return JSON.parse(userRaw) as VerifiedTelegramUser;
    } catch {
      throw new UnauthorizedException("Malformed user data in Telegram initData");
    }
  }
}

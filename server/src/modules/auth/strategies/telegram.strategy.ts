import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { TelegramAuthDto } from "../dto/telegram-auth.dto";

const MAX_AUTH_AGE_SECONDS = 86400; // 24 hours

@Injectable()
export class TelegramAuthVerifier {
  verify(payload: TelegramAuthDto, botToken: string): void {
    const { hash, ...fields } = payload;

    const dataCheckString = Object.keys(fields)
      .sort()
      .map((key) => `${key}=${(fields as Record<string, unknown>)[key]}`)
      .join("\n");

    const secretKey = createHash("sha256").update(botToken).digest();
    const computedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const isValid =
      computedHash.length === hash.length &&
      timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

    if (!isValid) {
      throw new UnauthorizedException("Invalid Telegram authentication payload");
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - payload.auth_date;
    if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
      throw new UnauthorizedException("Telegram authentication payload has expired");
    }
  }
}

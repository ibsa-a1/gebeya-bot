import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { TelegramAuthDto } from "./dto/telegram-auth.dto";
import { TelegramAuthVerifier } from "./strategies/telegram.strategy";
import { getEnv } from "../../config/env.util";

const FIFTEEN_MINUTES_IN_SECONDS = 60 * 60; // bumped to 1h for local dev convenience — revert before real production use
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly telegramVerifier: TelegramAuthVerifier,
  ) {}

  private async issueTokens(userId: string, email: string | null) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getEnv("JWT_ACCESS_SECRET"),
      expiresIn: FIFTEEN_MINUTES_IN_SECONDS,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: getEnv("JWT_REFRESH_SECRET"),
      expiresIn: SEVEN_DAYS_IN_SECONDS,
    });

    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async telegramLogin(dto: TelegramAuthDto) {
    const botToken = getEnv("PLATFORM_AUTH_BOT_TOKEN");
    this.telegramVerifier.verify(dto, botToken);

    const telegramId = String(dto.id);
    let user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          name: [dto.first_name, dto.last_name].filter(Boolean).join(" "),
        },
      });
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getEnv("JWT_REFRESH_SECRET"),
      });
      const accessToken = await this.jwtService.signAsync(
        { sub: payload.sub, email: payload.email },
        {
          secret: getEnv("JWT_ACCESS_SECRET"),
          expiresIn: FIFTEEN_MINUTES_IN_SECONDS,
        },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}

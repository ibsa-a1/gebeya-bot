import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TelegramAuthVerifier } from "./strategies/telegram.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { PlatformOwnerGuard } from "./guards/platform-owner.guard";
import { CryptoService } from "./crypto/crypto.service";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TelegramAuthVerifier,
    JwtAuthGuard,
    TenantGuard,
    PlatformOwnerGuard,
    CryptoService,
  ],
  exports: [JwtAuthGuard, TenantGuard, PlatformOwnerGuard, CryptoService],
})
export class AuthModule {}

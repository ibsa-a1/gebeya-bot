import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { TelegramAuthVerifier } from "./strategies/telegram.strategy";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let telegramVerifier: { verify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("mock-token"),
      verifyAsync: jest.fn(),
    };
    telegramVerifier = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: TelegramAuthVerifier, useValue: telegramVerifier },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("throws ConflictException if the email is already taken", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

      await expect(
        service.signup({ email: "taken@example.com", password: "password123", name: "Someone" }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("hashes the password and creates a user on success", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      prisma.user.create.mockResolvedValue({
        id: "new-user-id",
        email: "new@example.com",
        name: "New User",
      });

      const result = await service.signup({
        email: "new@example.com",
        password: "password123",
        name: "New User",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: "new@example.com", passwordHash: "hashed-password", name: "New User" },
      });
      expect(result.user.email).toBe("new@example.com");
      expect(result.accessToken).toBe("mock-token");
      expect(result.refreshToken).toBe("mock-token");
    });
  });

  describe("login", () => {
    it("throws UnauthorizedException if the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "ghost@example.com", password: "whatever" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException if the user has no password set (Telegram-only account)", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "telegram-user",
        email: "telegram@example.com",
        passwordHash: null,
      });

      await expect(
        service.login({ email: "telegram@example.com", password: "whatever" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException if the password is wrong", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "user@example.com",
        passwordHash: "hashed",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "user@example.com", password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("returns tokens on valid credentials", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-id",
        email: "user@example.com",
        passwordHash: "hashed",
        name: "User",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: "user@example.com", password: "correct" });

      expect(result.accessToken).toBe("mock-token");
      expect(result.user.email).toBe("user@example.com");
    });
  });

  describe("telegramLogin", () => {
    const telegramPayload = {
      id: 123456789,
      first_name: "Selam",
      auth_date: Math.floor(Date.now() / 1000),
      hash: "valid-hash",
    };

    it("throws if the Telegram payload verification fails", async () => {
      telegramVerifier.verify.mockImplementation(() => {
        throw new UnauthorizedException("Invalid Telegram authentication payload");
      });

      await expect(service.telegramLogin(telegramPayload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("creates a new user on first-time Telegram login", async () => {
      telegramVerifier.verify.mockReturnValue(undefined);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "new-telegram-user",
        email: null,
        name: "Selam",
      });

      const result = await service.telegramLogin(telegramPayload as any);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { telegramId: "123456789", name: "Selam" },
      });
      expect(result.accessToken).toBe("mock-token");
    });

    it("reuses an existing user on repeat Telegram login", async () => {
      telegramVerifier.verify.mockReturnValue(undefined);
      prisma.user.findUnique.mockResolvedValue({
        id: "existing-telegram-user",
        email: null,
        name: "Selam",
      });

      const result = await service.telegramLogin(telegramPayload as any);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe("existing-telegram-user");
    });
  });

  describe("refresh", () => {
    it("throws UnauthorizedException if the refresh token is invalid or expired", async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));

      await expect(service.refresh("bad-token")).rejects.toThrow(UnauthorizedException);
    });

    it("returns a new access token for a valid refresh token", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-id", email: "user@example.com" });

      const result = await service.refresh("good-refresh-token");

      expect(result.accessToken).toBe("mock-token");
    });
  });
});

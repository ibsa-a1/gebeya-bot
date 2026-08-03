import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { PlatformOwnerGuard } from "./platform-owner.guard";
import { PrismaService } from "../../../prisma/prisma.service";

describe("PlatformOwnerGuard", () => {
  let guard: PlatformOwnerGuard;
  let prisma: { user: { findUnique: jest.Mock } };

  const buildContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    guard = new PlatformOwnerGuard(prisma as unknown as PrismaService);
  });

  it("denies access when there is no authenticated user", async () => {
    const context = buildContext({ user: undefined });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("denies access when the authenticated user is not a platform owner", async () => {
    prisma.user.findUnique.mockResolvedValue({ isPlatformOwner: false });
    const context = buildContext({ user: { userId: "regular-user" } });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("denies access when the user record no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const context = buildContext({ user: { userId: "deleted-user" } });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("allows access for a genuine platform owner", async () => {
    prisma.user.findUnique.mockResolvedValue({ isPlatformOwner: true });
    const context = buildContext({ user: { userId: "owner-user" } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

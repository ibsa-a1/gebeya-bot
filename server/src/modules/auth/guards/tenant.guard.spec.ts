import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { TenantGuard } from "./tenant.guard";
import { PrismaService } from "../../../prisma/prisma.service";

describe("TenantGuard", () => {
  let guard: TenantGuard;
  let prisma: { tenantMembership: { findUnique: jest.Mock } };

  const buildContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    prisma = { tenantMembership: { findUnique: jest.fn() } };
    guard = new TenantGuard(prisma as unknown as PrismaService);
  });

  it("denies access when there is no authenticated user", async () => {
    const context = buildContext({ user: undefined, params: { tenantId: "tenant-1" } });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.tenantMembership.findUnique).not.toHaveBeenCalled();
  });

  it("denies access when no tenantId is present in the route params", async () => {
    const context = buildContext({ user: { userId: "user-1" }, params: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.tenantMembership.findUnique).not.toHaveBeenCalled();
  });

  it("denies access when the user has no membership in the requested tenant", async () => {
    prisma.tenantMembership.findUnique.mockResolvedValue(null);
    const context = buildContext({
      user: { userId: "user-1" },
      params: { tenantId: "tenant-1" },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.tenantMembership.findUnique).toHaveBeenCalledWith({
      where: { userId_tenantId: { userId: "user-1", tenantId: "tenant-1" } },
    });
  });

  it("denies access to a DIFFERENT tenant's data even for a legitimately authenticated user", async () => {
    // Simulates the core multi-tenancy threat: User A is real and logged in,
    // but tries to reach Tenant B's resources by manipulating the tenantId in the URL.
    prisma.tenantMembership.findUnique.mockResolvedValue(null);
    const context = buildContext({
      user: { userId: "user-a" },
      params: { tenantId: "tenant-b-not-users-own" },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("allows access and attaches tenant context when a valid membership exists", async () => {
    prisma.tenantMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      tenantId: "tenant-1",
      role: "OWNER",
    });
    const request = { user: { userId: "user-1" }, params: { tenantId: "tenant-1" } };
    const context = buildContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request).toHaveProperty("tenant", { id: "tenant-1", role: "OWNER" });
  });
});

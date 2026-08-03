import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.params?.tenantId;

    if (!user?.userId || !tenantId) {
      throw new ForbiddenException("Missing user or tenant context");
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.userId,
          tenantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this tenant's resources",
      );
    }

    request.tenant = { id: tenantId, role: membership.role };
    return true;
  }
}

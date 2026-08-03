import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser = request.user;

    if (!authUser?.userId) {
      throw new ForbiddenException("Authentication required");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { isPlatformOwner: true },
    });

    if (!user?.isPlatformOwner) {
      throw new ForbiddenException("This action requires platform owner privileges");
    }

    return true;
  }
}

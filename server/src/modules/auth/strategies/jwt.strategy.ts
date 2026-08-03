import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { getEnv } from "../../../config/env.util";

interface JwtPayload {
  sub: string;
  email: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getEnv("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    // Whatever is returned here becomes `request.user` on every protected route.
    return { userId: payload.sub, email: payload.email };
  }
}

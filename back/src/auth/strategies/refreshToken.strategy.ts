import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RefreshJwtAuthGuard extends AuthGuard('jwt-ref') {}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-ref') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        RefreshJwtStrategy.extractJWT,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: 'soy un secreto',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.cookies.refresh_token;
    return { ...payload, refreshToken };
  }

  private static extractJWT(req: Request): string | null {
    if (
      req.cookies &&
      'refresh_token' in req.cookies &&
      req.cookies.refresh_token.length > 0
    ) {
      return req.cookies.refresh_token;
    }
    return null;
  }
}

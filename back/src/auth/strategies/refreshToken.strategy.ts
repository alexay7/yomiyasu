import {ExtractJwt, Strategy} from "passport-jwt";
import {AuthGuard, PassportStrategy} from "@nestjs/passport";
import {Injectable} from "@nestjs/common";
import {Request} from "express";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class RefreshJwtAuthGuard extends AuthGuard("jwt-ref") {}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, "jwt-ref") {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                RefreshJwtStrategy.extractJWT,
                ExtractJwt.fromAuthHeaderAsBearerToken()
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("REFRESH_SECRET"),
            passReqToCallback: true
        });
    }

    validate(req: Request, payload: object) {
        const refreshToken = req.cookies.refresh_token;
        return {...payload, refreshToken};
    }

    private static extractJWT(req: Request): string | null {
        if (
            req.cookies &&
      "refresh_token" in req.cookies &&
      req.cookies.refresh_token.length > 0
        ) {
            return req.cookies.refresh_token;
        }
        return null;
    }
}

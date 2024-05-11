import {ExtractJwt, Strategy} from "passport-jwt";
import {AuthGuard, PassportStrategy} from "@nestjs/passport";
import {Injectable} from "@nestjs/common";
import {Request} from "express";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                JwtStrategy.extractJWT,
                ExtractJwt.fromAuthHeaderAsBearerToken()
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("ACCESS_SECRET")
        });
    }

    validate(payload: {sub:unknown}) {
        return {userId: payload.sub};
    }

    private static extractJWT(req: Request): string | null {
        if (
            req.cookies &&
      "access_token" in req.cookies &&
      req.cookies.access_token.length > 0
        ) {
            return req.cookies.access_token;
        }
        return null;
    }
}

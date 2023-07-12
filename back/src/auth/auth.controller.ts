import {
  Controller,
  Post,
  Req,
  Res,
  Body,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RefreshJwtAuthGuard } from './strategies/refreshToken.strategy';
import { AuthDto, RenewTokenDto } from './dto/auth.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  setAuthCookies(
    response: Response,
    tokens: {
      uuid?: string;
      accessToken?: string;
      refreshToken?: string;
    },
  ): void {
    const { uuid, accessToken, refreshToken } = tokens;

    if (accessToken) {
      // Si la función ha sido llamada con tokens, enviarselos al cliente en las cookies
      response
        .cookie('access_token', accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          expires: new Date(Date.now() + 1000 * 60 * 60 * 2),
        })
        .cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          // TODO: ajustar esto para que exista un rememberme que dure 1 mes
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        })
        .send({ status: 'ok', sessionId: uuid });
    } else {
      // Si ha sido llamada sin tokens, borrar las cookies para cerrar sesión
      response
        .clearCookie('access_token')
        .clearCookie('refresh_token')
        .send({ status: 'ok' });
    }
  }

  @Post('signup')
  async signup(@Res() res: Response, @Body() createUserDto: CreateUserDto) {
    const tokens = await this.authService.signUp(createUserDto);

    return this.setAuthCookies(res, tokens);
  }

  @Post('login')
  async login(@Res() res: Response, @Body() body: AuthDto) {
    if (!body) throw new UnauthorizedException();

    const tokens = await this.authService.signIn(body);

    return this.setAuthCookies(res, tokens);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { uuid: string },
  ) {
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    this.authService.signOut(body.uuid, userId);

    return this.setAuthCookies(res, {});
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  async refreshToken(
    @Res() res: Response,
    @Body() body: RenewTokenDto,
    @Req() req: Request,
  ) {
    const user = req.user as { refreshToken: string; sub: Types.ObjectId };

    // Comprobar que el token existe en la base de datos y que es válido
    const tokens = await this.authService.renewTokens(
      body.uuid,
      user.sub,
      user.refreshToken,
    );

    return this.setAuthCookies(res, tokens);
  }
}

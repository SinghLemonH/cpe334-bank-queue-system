import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { AuthService, CurrentUser as CurrentUserShape } from '../../application/auth.service';
import { AuthenticatedRequest, CurrentUser, SESSION_COOKIE } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { JsonBodyGuard } from '../guards/json-body.guard';
import { SessionAuthGuard } from '../guards/session-auth.guard';

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

/** F-01 endpoints (contract section 4). Thin: DTO in, service call, result out. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(JsonBodyGuard)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserShape> {
    const { user, token, maxAgeMs } = await this.auth.login(dto.username, dto.password);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: maxAgeMs });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.sessionToken as string);
    res.cookie(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: CurrentUserShape): CurrentUserShape {
    return user;
  }
}

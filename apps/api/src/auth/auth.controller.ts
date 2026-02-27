import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, LogoutResponseDto } from './dto/auth-response.dto';
import { SESSION_COOKIE_NAME } from './auth.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('demo')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as demo user (creates session + HttpOnly cookie)' })
  @ApiOkResponse({ description: 'Session created, cookie set', type: AuthResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (10 req/min)' })
  @ApiInternalServerErrorResponse({ description: 'Demo user not found (seed missing)' })
  async loginDemo(@Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const { sessionId, expiresAt, user } = await this.authService.loginDemo();

    res.cookie(SESSION_COOKIE_NAME, sessionId, this.buildCookieOptions(expiresAt));
    return { data: user };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Session created, cookie set', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (10 req/min)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { sessionId, expiresAt, user } = await this.authService.loginWithCredentials(
      dto.email,
      dto.password,
    );

    res.cookie(SESSION_COOKIE_NAME, sessionId, this.buildCookieOptions(expiresAt));
    return { data: user };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user from session cookie' })
  @ApiCookieAuth('sessionId')
  @ApiOkResponse({ description: 'Authenticated user', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async me(@Req() req: Request): Promise<AuthResponseDto> {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    const user = await this.authService.getMe(sessionId);

    return { data: user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (deletes session + clears cookie)' })
  @ApiCookieAuth('sessionId')
  @ApiOkResponse({ description: 'Logged out', type: LogoutResponseDto })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    await this.authService.logout(sessionId);

    res.cookie(SESSION_COOKIE_NAME, '', {
      ...this.buildCookieOptions(new Date(0)),
      maxAge: 0,
    });

    return { data: { ok: true } };
  }

  private buildCookieOptions(expiresAt: Date) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      expires: expiresAt,
    };
  }
}

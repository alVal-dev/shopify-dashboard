import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '@shared/types';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';

export type AuthLoginResult = {
  sessionId: string;
  expiresAt: Date;
  user: AuthUser; 
};

type DbUser = {
  id: string;
  email: string;
  role: 'DEMO' | 'USER';
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  private toAuthUser(user: DbUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role === 'DEMO' ? 'demo' : 'user',
    };
  }

  private async getDemoUser(): Promise<DbUser> {
    const demoEmail = this.configService.get<string>(
      'DEMO_EMAIL',
      'demo@shopify-dashboard.com',
    );

    const user = await this.prisma.client.user.findUnique({
      where: { email: demoEmail },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new InternalServerErrorException(
        `Demo user not found (email: ${demoEmail}). Run the database seed.`,
      );
    }

    // Garde-fou : évite de “démoter” la démo si quelqu’un modifie la DB.
    if (user.role !== 'DEMO') {
      throw new InternalServerErrorException(
        `Demo user has invalid role (expected DEMO, got ${user.role}).`,
      );
    }

    return user;
  }

  async loginDemo(): Promise<AuthLoginResult> {
    const user = await this.getDemoUser();
    const { sessionId, expiresAt } = await this.sessionsService.createSession(user.id);

    return {
      sessionId,
      expiresAt,
      user: this.toAuthUser(user),
    };
  }

  /**
   * Login par email/password.
   * Erreur générique (évite l'user enumeration).
   */
  async loginWithCredentials(emailRaw: string, passwordRaw: string): Promise<AuthLoginResult> {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;

    if (!email || !password) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, password: true },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const { sessionId, expiresAt } = await this.sessionsService.createSession(user.id);

    return {
      sessionId,
      expiresAt,
      user: this.toAuthUser({ id: user.id, email: user.email, role: user.role }),
    };
  }

  async getMe(sessionId: string | undefined): Promise<AuthUser> {
    const validated = await this.sessionsService.validateSession(sessionId ?? '');

    if (!validated) {
      throw new UnauthorizedException();
    }

    return this.toAuthUser(validated.user);
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    await this.sessionsService.deleteSession(sessionId);
  }
}
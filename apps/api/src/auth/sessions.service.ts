import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type ValidatedSession = {
  sessionId: string;
  user: {
    id: string;
    email: string;
    role: 'DEMO' | 'USER';
  };
};

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.client.session.create({
      data: {
        sessionId,
        userId,
        expiresAt,
      },
    });

    return { sessionId, expiresAt };
  }

  /**
   * Retourne null si la session n'existe pas ou si elle est expirée.
   * Si expirée : suppression lazy best-effort (ne doit pas faire échouer la requête).
   */
  async validateSession(sessionId: string): Promise<ValidatedSession | null> {
    if (!sessionId) return null;

    const session = await this.prisma.client.session.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!session) return null;

    const isExpired = session.expiresAt.getTime() <= Date.now();
    if (isExpired) {
      await this.prisma.client.session.delete({ where: { sessionId } }).catch(() => undefined); // best-effort
      return null;
    }

    return {
      sessionId: session.sessionId,
      user: session.user,
    };
  }

  /**
   * Logout : best-effort.
   * deleteMany évite de throw si la session a déjà été supprimée.
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!sessionId) return;

    await this.prisma.client.session.deleteMany({
      where: { sessionId },
    });
  }
}

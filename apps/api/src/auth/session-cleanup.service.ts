import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Supprime les sessions expirées toutes les heures.
   *
   * Best-effort : la vraie protection est la validation expiresAt
   * dans SessionsService.validateSession() à chaque requête.
   * Sur un PaaS (Render free tier), le process peut dormir,
   * donc ce CRON n'est pas garanti en timing strict.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await this.prisma.client.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired session(s)`);
      } else {
        this.logger.debug('No expired sessions to clean up');
      }
    } catch (error) {
      this.logger.error('Failed to clean up expired sessions', error);
    }
  }
}

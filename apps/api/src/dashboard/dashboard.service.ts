import { Injectable, Logger } from '@nestjs/common';
import type { DashboardLayout, WidgetConfig, WidgetPosition, WidgetType } from '@shared/types';

import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LAYOUT } from './default-layout';
import { WIDGET_TYPES } from './widget-types.constants';

/**
 * Toute évolution de `shared/types/dashboard.ts` doit entraîner mise à jour simultanée de :
 * - widget-types.constants.ts
 * - dto/layout.dto.ts
 * - dto/update-layout.dto.ts
 * - toLayoutJson()
 * - isDashboardLayout()
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && WIDGET_TYPES.some((widgetType) => widgetType === value);
}

function isWidgetPosition(value: unknown): value is WidgetPosition {
  if (!isRecord(value)) return false;

  const x = value['x'];
  const y = value['y'];
  const w = value['w'];
  const h = value['h'];

  return (
    typeof x === 'number' && typeof y === 'number' && typeof w === 'number' && typeof h === 'number'
  );
}

function isWidgetConfig(value: unknown): value is WidgetConfig {
  if (!isRecord(value)) return false;

  const id = value['id'];
  const type = value['type'];
  const title = value['title'];
  const position = value['position'];

  if (typeof id !== 'string') return false;
  if (!isWidgetType(type)) return false;
  if (typeof title !== 'string') return false;
  if (!isWidgetPosition(position)) return false;

  return true;
}

function isDashboardLayout(value: unknown): value is DashboardLayout {
  if (!isRecord(value)) return false;

  const widgets = value['widgets'];
  if (!Array.isArray(widgets)) return false;

  return widgets.every(isWidgetConfig);
}

function toLayoutJson(layout: DashboardLayout) {
  return {
    widgets: layout.widgets.map((widget) => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      position: {
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
      },
    })),
  };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLayout(userId: string): Promise<DashboardLayout> {
    const record = await this.prisma.client.dashboardLayout.findUnique({
      where: { userId },
      select: { config: true },
    });

    if (!record) {
      this.logger.debug(`No layout found for user ${userId}, returning default`);
      return DEFAULT_LAYOUT;
    }

    if (!isDashboardLayout(record.config)) {
      this.logger.warn(`Invalid layout JSON in DB for user ${userId}, returning default`);
      return DEFAULT_LAYOUT;
    }

    return record.config;
  }

  async saveLayout(userId: string, layout: DashboardLayout): Promise<DashboardLayout> {
    const config = toLayoutJson(layout);

    await this.prisma.client.dashboardLayout.upsert({
      where: { userId },
      update: { config },
      create: { userId, config },
      select: { id: true },
    });

    this.logger.debug(`Layout saved for user ${userId}`);
    return layout;
  }
}

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import type { AnalyticsSnapshot, ApiResponse } from '@shared/types';

import { AuthGuard } from '../../auth/auth.guard';
import { SESSION_COOKIE_NAME } from '../../auth/auth.constants';
import { AnalyticsResponseDto } from '../dto/responses/api-response.dto';
import { MockShopifyDataService } from '../mock-shopify-data.service';

@ApiTags('Mock Shopify')
@ApiCookieAuth('sessionId')
@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly dataService: MockShopifyDataService) {}

  @Get()
  @ApiOperation({ summary: 'KPIs et analytics agrégés' })
  @ApiOkResponse({
    description: 'Snapshot analytics (KPIs, trend, top products)',
    type: AnalyticsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Session invalide ou absente' })
  getAnalytics(@Req() req: Request): ApiResponse<AnalyticsSnapshot> {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string;
    const snapshot = this.dataService.getOrInitForSession(sessionId);

    return { data: snapshot.analytics };
  }
}

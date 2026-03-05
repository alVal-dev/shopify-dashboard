import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import type { ApiResponse, Order, PaginatedResponse } from '@shared/types';

import { AuthGuard } from '../../auth/auth.guard';
import { SESSION_COOKIE_NAME } from '../../auth/auth.constants';
import { OrdersQueryDto } from '../dto/orders-query.dto';
import { OrdersResponseDto } from '../dto/responses/api-response.dto';
import { paginate } from '../helpers/paginate';
import { MockShopifyDataService } from '../mock-shopify-data.service';

@ApiTags('Mock Shopify')
@ApiCookieAuth('sessionId')
@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly dataService: MockShopifyDataService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des commandes' })
  @ApiOkResponse({ description: 'Liste des commandes avec pagination', type: OrdersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Session invalide ou absente' })
  findAll(
    @Query() query: OrdersQueryDto,
    @Req() req: Request,
  ): ApiResponse<PaginatedResponse<Order>> {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string;
    const snapshot = this.dataService.getOrInitForSession(sessionId);

    const filtered = query.status
      ? snapshot.orders.filter((o) => o.financialStatus === query.status)
      : snapshot.orders;

    const sorted = filtered.slice().sort((a, b) => {
      let cmp: number;

      switch (query.sortBy) {
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'totalPriceCents':
          cmp = a.totalPriceCents - b.totalPriceCents;
          break;
        case 'orderNumber':
          cmp = a.orderNumber - b.orderNumber;
          break;
        default:
          cmp = a.createdAt.localeCompare(b.createdAt);
      }

      return query.sortOrder === 'asc' ? cmp : -cmp;
    });

    const paginated = paginate(sorted, query.page, query.limit);

    return { data: paginated };
  }
}

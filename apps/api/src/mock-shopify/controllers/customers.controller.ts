import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import type { ApiResponse, Customer, PaginatedResponse } from '@shared/types';

import { AuthGuard } from '../../auth/auth.guard';
import { SESSION_COOKIE_NAME } from '../../auth/auth.constants';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { CustomersResponseDto } from '../dto/responses/api-response.dto';
import { paginate } from '../helpers/paginate';
import { MockShopifyDataService } from '../mock-shopify-data.service';

@ApiTags('Mock Shopify')
@ApiCookieAuth('sessionId')
@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly dataService: MockShopifyDataService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des clients' })
  @ApiOkResponse({ description: 'Liste des clients avec pagination', type: CustomersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Session invalide ou absente' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Req() req: Request,
  ): ApiResponse<PaginatedResponse<Customer>> {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string;
    const snapshot = this.dataService.getOrInitForSession(sessionId);

    const sorted = snapshot.customers.slice().sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return query.sortOrder === 'asc' ? cmp : -cmp;
    });

    const paginated = paginate(sorted, query.page, query.limit);

    return { data: paginated };
  }
}

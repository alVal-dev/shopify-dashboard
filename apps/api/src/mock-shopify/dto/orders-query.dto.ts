import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import type { FinancialStatus } from '@shared/types';
import { PaginationQueryDto } from './pagination-query.dto';

const ORDER_SORT_FIELDS = ['createdAt', 'totalPriceCents', 'orderNumber'] as const;
type OrderSortBy = (typeof ORDER_SORT_FIELDS)[number];

const FINANCIAL_STATUSES = ['pending', 'paid', 'refunded', 'cancelled'] as const;

export class OrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Champ de tri',
    enum: ORDER_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS)
  sortBy: OrderSortBy = 'createdAt';

  @ApiPropertyOptional({ description: 'Filtrer par statut financier', enum: FINANCIAL_STATUSES })
  @IsOptional()
  @IsIn(FINANCIAL_STATUSES)
  status?: FinancialStatus;
}

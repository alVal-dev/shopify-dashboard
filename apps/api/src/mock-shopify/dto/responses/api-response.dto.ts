import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsSnapshotDto } from './analytics.dto';
import { PaginatedOrdersDto, PaginatedProductsDto, PaginatedCustomersDto } from './paginated.dto';

export class OrdersResponseDto {
  @ApiProperty({ description: 'Données paginées des commandes', type: PaginatedOrdersDto })
  data: PaginatedOrdersDto;
}

export class ProductsResponseDto {
  @ApiProperty({ description: 'Données paginées des produits', type: PaginatedProductsDto })
  data: PaginatedProductsDto;
}

export class CustomersResponseDto {
  @ApiProperty({ description: 'Données paginées des clients', type: PaginatedCustomersDto })
  data: PaginatedCustomersDto;
}

export class AnalyticsResponseDto {
  @ApiProperty({ description: 'Snapshot analytics complet', type: AnalyticsSnapshotDto })
  data: AnalyticsSnapshotDto;
}

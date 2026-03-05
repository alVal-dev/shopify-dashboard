import { ApiProperty } from '@nestjs/swagger';
import { OrderDto } from './order.dto';
import { ProductDto } from './product.dto';
import { CustomerDto } from './customer.dto';

export class PaginatedOrdersDto {
  @ApiProperty({ description: 'Liste des commandes', type: [OrderDto] })
  data: OrderDto[];

  @ApiProperty({ description: "Nombre total d'éléments" })
  total: number;

  @ApiProperty({ description: 'Page courante' })
  page: number;

  @ApiProperty({ description: 'Éléments par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}

export class PaginatedProductsDto {
  @ApiProperty({ description: 'Liste des produits', type: [ProductDto] })
  data: ProductDto[];

  @ApiProperty({ description: "Nombre total d'éléments" })
  total: number;

  @ApiProperty({ description: 'Page courante' })
  page: number;

  @ApiProperty({ description: 'Éléments par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}

export class PaginatedCustomersDto {
  @ApiProperty({ description: 'Liste des clients', type: [CustomerDto] })
  data: CustomerDto[];

  @ApiProperty({ description: "Nombre total d'éléments" })
  total: number;

  @ApiProperty({ description: 'Page courante' })
  page: number;

  @ApiProperty({ description: 'Éléments par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}

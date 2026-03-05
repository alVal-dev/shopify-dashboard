import { ApiProperty } from '@nestjs/swagger';

export class OrderLineItemDto {
  @ApiProperty({ description: 'ID du line item' })
  id: string;

  @ApiProperty({ description: 'ID du produit' })
  productId: string;

  @ApiProperty({ description: 'ID de la variante' })
  variantId: string;

  @ApiProperty({ description: 'Titre du produit + variante' })
  title: string;

  @ApiProperty({ description: 'Quantité commandée', minimum: 1 })
  quantity: number;

  @ApiProperty({ description: 'Prix unitaire en centimes' })
  unitPriceCents: number;

  @ApiProperty({ description: 'SKU de la variante' })
  sku: string;
}

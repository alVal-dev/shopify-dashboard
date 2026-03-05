import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty({ description: 'ID de la variante' })
  id: string;

  @ApiProperty({ description: 'Titre de la variante (taille, couleur, etc.)' })
  title: string;

  @ApiProperty({ description: 'Prix en centimes' })
  priceCents: number;

  @ApiProperty({ description: 'SKU unique' })
  sku: string;

  @ApiProperty({ description: 'Quantité en stock' })
  inventoryQuantity: number;
}

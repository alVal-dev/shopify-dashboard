import { ApiProperty } from '@nestjs/swagger';
import { ProductVariantDto } from './product-variant.dto';

export class ProductDto {
  @ApiProperty({ description: 'ID du produit' })
  id: string;

  @ApiProperty({ description: 'Titre du produit' })
  title: string;

  @ApiProperty({ description: 'Marque / vendeur' })
  vendor: string;

  @ApiProperty({ description: 'Type de produit' })
  productType: string;

  @ApiProperty({ description: 'Variantes du produit', type: [ProductVariantDto] })
  variants: ProductVariantDto[];

  @ApiProperty({ description: "URL de l'image placeholder" })
  imageUrl: string;

  @ApiProperty({ description: 'Stock total (somme des variantes)' })
  totalInventory: number;

  @ApiProperty({ description: 'Date de création ISO', format: 'date-time' })
  createdAt: string;
}

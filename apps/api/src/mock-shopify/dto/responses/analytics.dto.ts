import { ApiProperty } from '@nestjs/swagger';

export class KpiMetricsDto {
  @ApiProperty({ description: "Chiffre d'affaires en centimes" })
  revenueCents: number;

  @ApiProperty({ description: 'Variation du CA en %' })
  revenueChange: number;

  @ApiProperty({ description: 'Nombre de commandes' })
  ordersCount: number;

  @ApiProperty({ description: 'Variation du nombre de commandes en %' })
  ordersCountChange: number;

  @ApiProperty({ description: 'Panier moyen en centimes' })
  averageOrderValueCents: number;

  @ApiProperty({ description: 'Variation du panier moyen en %' })
  averageOrderValueChange: number;

  @ApiProperty({ description: 'Nombre de clients uniques' })
  customersCount: number;

  @ApiProperty({ description: 'Variation du nombre de clients en %' })
  customersCountChange: number;
}

export class SalesTrendPointDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'CA du jour en centimes' })
  revenueCents: number;

  @ApiProperty({ description: 'Nombre de commandes du jour' })
  ordersCount: number;
}

export class TopProductDto {
  @ApiProperty({ description: 'ID du produit' })
  productId: string;

  @ApiProperty({ description: 'Titre du produit' })
  title: string;

  @ApiProperty({ description: 'CA généré en centimes' })
  revenueCents: number;

  @ApiProperty({ description: 'Unités vendues' })
  unitsSold: number;
}

export class AnalyticsSnapshotDto {
  @ApiProperty({ description: 'KPIs principaux', type: KpiMetricsDto })
  kpis: KpiMetricsDto;

  @ApiProperty({ description: 'Tendance des ventes sur 30 jours', type: [SalesTrendPointDto] })
  salesTrend: SalesTrendPointDto[];

  @ApiProperty({ description: 'Top 5 produits par CA', type: [TopProductDto] })
  topProducts: TopProductDto[];
}

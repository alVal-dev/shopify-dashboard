import { ApiProperty } from '@nestjs/swagger';
import { OrderLineItemDto } from './order-line-item.dto';

export class OrderDto {
  @ApiProperty({ description: 'ID de la commande' })
  id: string;

  @ApiProperty({ description: 'Numéro de commande', example: 1450 })
  orderNumber: number;

  @ApiProperty({ description: 'ID du client' })
  customerId: string;

  @ApiProperty({ description: 'Email du client' })
  email: string;

  @ApiProperty({ description: 'Nom complet du client' })
  customerName: string;

  @ApiProperty({ description: 'Montant total en centimes' })
  totalPriceCents: number;

  @ApiProperty({ description: 'Devise', example: 'EUR' })
  currency: string;

  @ApiProperty({
    description: 'Statut financier',
    enum: ['pending', 'paid', 'refunded', 'cancelled'],
  })
  financialStatus: 'pending' | 'paid' | 'refunded' | 'cancelled';

  @ApiProperty({
    description: 'Statut de fulfillment',
    enum: ['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'],
  })
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'shipped' | 'delivered';

  @ApiProperty({ description: 'Articles de la commande', type: [OrderLineItemDto] })
  lineItems: OrderLineItemDto[];

  @ApiProperty({ description: 'Ville de livraison' })
  shippingCity: string;

  @ApiProperty({ description: 'Pays de livraison' })
  shippingCountry: string;

  @ApiProperty({ description: 'Date de création ISO', format: 'date-time' })
  createdAt: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class CustomerDto {
  @ApiProperty({ description: 'ID du client' })
  id: string;

  @ApiProperty({ description: 'Prénom' })
  firstName: string;

  @ApiProperty({ description: 'Nom de famille' })
  lastName: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiProperty({ description: 'Nombre de commandes' })
  ordersCount: number;

  @ApiProperty({ description: 'Montant total dépensé en centimes' })
  totalSpentCents: number;

  @ApiProperty({ description: 'Segment client', enum: ['new', 'returning', 'vip'] })
  segment: 'new' | 'returning' | 'vip';

  @ApiProperty({ description: 'Ville' })
  city: string;

  @ApiProperty({ description: 'Pays' })
  country: string;

  @ApiProperty({ description: 'Date de création ISO', format: 'date-time' })
  createdAt: string;
}

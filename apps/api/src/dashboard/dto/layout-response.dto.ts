import { ApiProperty } from '@nestjs/swagger';

import { DashboardLayoutDto } from './layout.dto';

export class LayoutResponseDto {
  @ApiProperty({ description: 'Layout du dashboard', type: DashboardLayoutDto })
  data: DashboardLayoutDto;
}

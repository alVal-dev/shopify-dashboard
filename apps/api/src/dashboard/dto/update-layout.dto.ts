import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { WidgetConfigDto } from './layout.dto';

export class UpdateLayoutDto {
  @ApiProperty({ description: 'Liste des widgets', type: [WidgetConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetConfigDto)
  widgets: WidgetConfigDto[];
}

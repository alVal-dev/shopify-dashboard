import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import type { DashboardLayout, WidgetConfig, WidgetPosition, WidgetType } from '@shared/types';

import { WIDGET_TYPES } from '../widget-types.constants';

export class WidgetPositionDto implements WidgetPosition {
  @ApiProperty({ description: 'Position X (colonne)', example: 0 })
  @IsInt()
  @Min(0)
  x: number;

  @ApiProperty({ description: 'Position Y (ligne)', example: 0 })
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty({ description: 'Largeur en colonnes', example: 6 })
  @IsInt()
  @Min(1)
  w: number;

  @ApiProperty({ description: 'Hauteur en unités', example: 2 })
  @IsInt()
  @Min(1)
  h: number;
}

export class WidgetConfigDto implements WidgetConfig {
  @ApiProperty({ description: 'ID unique du widget', example: 'kpi-1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Type de widget',
    enum: WIDGET_TYPES,
    example: 'kpi-cards',
  })
  @IsIn(WIDGET_TYPES)
  type: WidgetType;

  @ApiProperty({ description: 'Titre affiché', example: 'Indicateurs clés' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Position et taille', type: WidgetPositionDto })
  @ValidateNested()
  @Type(() => WidgetPositionDto)
  position: WidgetPositionDto;
}

export class DashboardLayoutDto implements DashboardLayout {
  @ApiProperty({ description: 'Liste des widgets', type: [WidgetConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetConfigDto)
  widgets: WidgetConfigDto[];
}

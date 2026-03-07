import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shared/types';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { LayoutSaveRateLimitGuard } from './layout-save-rate-limit.guard';
import { LayoutResponseDto } from './dto/layout-response.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';

@ApiTags('Dashboard')
@ApiCookieAuth('sessionId')
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('layout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard layout for current user' })
  @ApiOkResponse({ description: 'Dashboard layout', type: LayoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getLayout(@CurrentUser() authUser: AuthUser): Promise<LayoutResponseDto> {
    const layout = await this.dashboardService.getLayout(authUser.id);
    return { data: layout };
  }

  @Put('layout')
  @UseGuards(LayoutSaveRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save dashboard layout for current user' })
  @ApiOkResponse({ description: 'Layout saved', type: LayoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Demo accounts cannot save layout' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (5 req/min)' })
  async updateLayout(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: UpdateLayoutDto,
  ): Promise<LayoutResponseDto> {
    if (authUser.role === 'demo') {
      throw new ForbiddenException('Les comptes démo ne peuvent pas sauvegarder le layout');
    }

    const layout = await this.dashboardService.saveLayout(authUser.id, {
      widgets: dto.widgets,
    });

    return { data: layout };
  }
}

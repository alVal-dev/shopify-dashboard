import { Controller, Get, Param, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';
import { ExportService, SUPPORTED_EXPORT_TYPES } from './export.service';

@ApiTags('Export')
@ApiCookieAuth('sessionId')
@Controller('export')
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':type')
  @ApiOperation({ summary: 'Export current session data as CSV' })
  @ApiParam({ name: 'type', enum: SUPPORTED_EXPORT_TYPES })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'CSV export file' })
  @ApiUnauthorizedResponse({ description: 'Session invalide ou absente' })
  @ApiBadRequestResponse({ description: 'Unsupported export type' })
  downloadCsv(@Param('type') type: string, @Req() req: Request, @Res() res: Response): void {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const csvFile = this.exportService.generateCsv(type, sessionId);
    const body = Buffer.from(csvFile.content, 'utf8');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${csvFile.filename}"`);
    res.send(body);
  }
}

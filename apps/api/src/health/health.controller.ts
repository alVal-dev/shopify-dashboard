import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Vérifie que le serveur est opérationnel' })
  @ApiResponse({ status: 200, description: 'Le serveur est en ligne' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

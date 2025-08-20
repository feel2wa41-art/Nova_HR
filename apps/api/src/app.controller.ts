import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth(): { message: string; timestamp: string; version: string } {
    return this.appService.getHealth();
  }

  @Get('time')
  @ApiOperation({ summary: 'Get server time' })
  @ApiResponse({ status: 200, description: 'Current server time' })
  getTime(): { timestamp: string; timezone: string; unix: number } {
    return this.appService.getTime();
  }
}
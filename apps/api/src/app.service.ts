import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; timestamp: string; version: string } {
    return {
      message: 'Nova HR API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getTime(): { timestamp: string; timezone: string; unix: number } {
    const now = new Date();
    return {
      timestamp: now.toISOString(),
      timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Jakarta',
      unix: Math.floor(now.getTime() / 1000),
    };
  }
}
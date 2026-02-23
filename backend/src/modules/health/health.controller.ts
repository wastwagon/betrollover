import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Liveness: always returns 200 if process is running. Use for basic uptime checks. */
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'betrollover-api',
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: checks DB connectivity. Returns 503 if DB unreachable. Use for load balancer / k8s readiness. */
  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch (err: unknown) {
      checks.database = err instanceof Error ? err.message : 'unreachable';
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'betrollover-api',
        timestamp: new Date().toISOString(),
        checks,
      });
    }

    return {
      status: 'ok',
      service: 'betrollover-api',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

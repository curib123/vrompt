import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: ReturnType<typeof createClient> | null = null;
  private connecting: Promise<ReturnType<typeof createClient>> | null = null;

  constructor(private readonly configService: ConfigService) {}

  private async getClient() {
    if (this.client?.isOpen) {
      return this.client;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = (async () => {
      const client = createClient({
        url: this.configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        ),
        socket: {
          reconnectStrategy: false,
          connectTimeout: 1000,
        },
      });

      client.on('error', (error) => {
        this.logger.warn(`Redis error: ${error.message}`);
      });

      await client.connect();
      this.client = client;
      return client;
    })();

    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async ping() {
    const client = await this.getClient();
    return client.ping();
  }

  async onApplicationShutdown() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}

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

  async increment(key: string, ttlSeconds: number) {
    const client = await this.getClient();
    return Number(
      await client.eval(
        "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
        { keys: [key], arguments: [String(ttlSeconds)] },
      ),
    );
  }

  async delete(key: string) {
    if (!this.client?.isOpen) {
      return;
    }

    await this.client.del(key);
  }

  async decrement(key: string) {
    if (!this.client?.isOpen) return 0;
    return this.client.decr(key);
  }

  async onApplicationShutdown() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}

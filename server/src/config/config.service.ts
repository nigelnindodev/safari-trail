import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EncryptionKeys } from './config.types';
import z from 'zod';

@Injectable()
export class AppConfigService extends ConfigService {
  private readonly encryptionKeysSchema = z.object({
    current: z.string(),
    keys: z.record(z.string(), z.string()),
  });

  get database() {
    return {
      host: this.get<string>('PG_HOST', '0.0.0.0'),
      port: this.get<number>('PG_PORT', 5432),
      username: this.get<string>('PG_USERNAME', 'changeuser'),
      password: this.get<string>('PG_PASSWORD', 'changepass'),
      database: this.get<string>('PG_DATABASE', 'change_dbname'),
    };
  }

  get typeOrmConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      ...this.database,
      autoLoadEntities: true,
      // synchronize: this.get('NODE_ENV') !== 'production'
      // let's keep it simple for now and use synchronize true
      synchronize: true,
      logging: this.get('NODE_ENV') === 'development',
    };
  }

  get httpPort(): number {
    return this.get<number>('HTTP_PORT', 5000);
  }

  get redisConfig(): { host: string; port: number } {
    return {
      host: this.get<string>('REDIS_HOST', 'localhost'),
      port: this.get<number>('REDIS_PORT', 6379),
    };
  }

  // Server should not start if missing
  get googleOAuthConfiguration(): { clientId: string; clientSecret: string } {
    const clientId = this.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!clientId) {
      throw new Error('GOOGLE_OAUTH_CLIENT_ID is not set');
    }
    if (!clientSecret) {
      throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not set');
    }
    return {
      clientId,
      clientSecret,
    };
  }

  get jwtSecret(): string {
    const jwtSecret = this.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }
    return jwtSecret;
  }

  // Server should not start if missing, or incorrect format
  get encryptionKeys(): EncryptionKeys {
    const raw = this.get<string>('ENCRYPTION_KEYS', '');
    let parsed: unknown;

    if (!raw) {
      throw new Error('ENCRYPTION_KEYS is not set');
    }

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('ENCRYPTION_KEYS is not valid JSON');
    }

    const result = this.encryptionKeysSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`ENCRYPTION_KEYS invalid: ${result.error.message}`);
    }
    if (!result.data.keys[result.data.current]) {
      throw new Error(
        'ENCRYPTION_KEYS "current" must reference an existing key in "keys"',
      );
    }

    return {
      current: result.data.current,
      keys: Object.fromEntries(
        Object.entries(result.data.keys).map(([id, key]) => [
          id,
          Buffer.from(key, 'base64'),
        ]),
      ),
    };
  }

  get serverBaseUrl() {
    return this.get<string>(
      'SERVER_BASE_URL',
      `http://localhost:${this.httpPort}`,
    );
  }

  get clientBaseUrl() {
    return this.get<string>('CLIENT_BASE_URL', 'http://localhost:3000');
  }

  get isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  get isProduction() {
    return this.get('NODE_ENV') === 'production';
  }
}

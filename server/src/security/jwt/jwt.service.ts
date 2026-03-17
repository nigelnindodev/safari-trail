import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from 'src/config';
import * as crypto from 'crypto';
import z from 'zod';
import { JwtPayload } from 'src/types';

// Manually create matching schema
const JwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.email(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
}) satisfies z.ZodType<JwtPayload>;

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(private configService: AppConfigService) {
    this.secret = configService.jwtSecret;
    this.expiresInSeconds = 60 * 60; // an hour for testing purposes
  }

  get tokenExpiryInSeconds(): number {
    return this.expiresInSeconds;
  }

  /**
   * Generate a JWT token using HMAC-SHA256
   */
  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this.expiresInSeconds,
    };

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));

    const signature = this.createSignature(encodedHeader, encodedPayload);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode a JWT token
   */
  verify(token: string): JwtPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 1. Verify signature using a timing-safe comparison
    const expectedSignature = this.createSignature(
      encodedHeader,
      encodedPayload,
    );
    if (!this.safeCompare(signature, expectedSignature)) {
      const errorMessage = 'Invalid token signature';
      this.logger.warn(errorMessage);
      throw new UnauthorizedException(errorMessage);
    }

    // 2. Decode payload
    let payload: unknown;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    } catch {
      const errorMessage = 'Invalid payload encoding';
      this.logger.warn(errorMessage);
      throw new UnauthorizedException(errorMessage);
    }

    const parsedPayload = JwtPayloadSchema.safeParse(payload);

    // 3. Validate payload structure with Zod
    if (!parsedPayload.success) {
      const errorMessage = 'Invalid token payload structure';
      this.logger.warn(errorMessage);
      throw new UnauthorizedException(errorMessage);
    }

    // 4. Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (parsedPayload.data.exp && parsedPayload.data.exp < now) {
      const errorMessage = 'Token expired';
      this.logger.warn(errorMessage);
      throw new UnauthorizedException(errorMessage);
    }

    // 5. Validate issued at time (not in the future)
    // Allow 60s clock skew
    if (parsedPayload.data.iat > now + 60) {
      const errorMessage = 'Token issued in the future';
      this.logger.warn(errorMessage);
      throw new UnauthorizedException(errorMessage);
    }

    return parsedPayload.data;
  }

  /**
   * Prevents timing attacks by comparing signatures in constant time
   */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private createSignature(
    encodedHeader: string,
    encodedPayload: string,
  ): string {
    const data = `${encodedHeader}.${encodedPayload}`;
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  private base64UrlEncode(input: string | Buffer): string {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buffer.toString('base64url');
  }

  private base64UrlDecode(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf8');
  }
}

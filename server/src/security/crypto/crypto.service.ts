import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config';

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Result } from 'true-myth';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keys: Record<string, Buffer>;
  private readonly currentKeyId: string;

  constructor(private readonly config: AppConfigService) {
    const { current, keys } = config.encryptionKeys;
    this.currentKeyId = current;
    this.keys = keys;
  }

  encrypt(text: string): Result<string, Error> {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv(
        this.algorithm,
        this.keys[this.currentKeyId],
        iv,
      );

      let encrypted = cipher.update(text, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();

      // Format: keyId:iv:tag:ciphertext
      return Result.ok(
        [
          this.currentKeyId,
          iv.toString('base64'),
          tag.toString('base64'),
          encrypted,
        ].join(':'),
      );
    } catch (e) {
      const errorMessage = `Encryption error : [${e instanceof Error ? e.message : 'unknown error'}]`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }

  decrypt(combined: string): Result<string, Error> {
    try {
      const [keyId, ivStr, tagStr, encrypted] = combined.split(':');
      const key = this.keys[keyId];
      if (!key) {
        return Result.err(new Error(`Unknown encryption key id: ${keyId}`));
      }

      const decipher = createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(ivStr, 'base64'),
      );

      decipher.setAuthTag(Buffer.from(tagStr, 'base64'));
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return Result.ok(decrypted);
    } catch (e) {
      const errorMessage = `Decryption error : [${e instanceof Error ? e.message : 'unknown error'}]`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }
}

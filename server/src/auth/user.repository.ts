import { Injectable, Logger } from '@nestjs/common';
import { OAuthProvider } from './auth.types';
import { Token } from './entity/tokens.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maybe, Result } from 'true-myth';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async getToken(
    externalId: string,
    provider: OAuthProvider,
  ): Promise<Maybe<Token>> {
    this.logger.log(`Fetching token for external id ${externalId}`);
    const token = await this.tokenRepository.findOneBy({
      externalId,
      provider,
    });
    return Maybe.of(token);
  }

  async createToken(
    tokenData: Omit<Token, 'id' | 'user' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<Token, Error>> {
    this.logger.log(
      `Attempting to create token for external id${tokenData.externalId} with provider ${tokenData.provider}`,
    );
    try {
      const token = this.tokenRepository.create(tokenData);
      const savedToken = await this.tokenRepository.save(token);
      return Result.ok(savedToken);
    } catch (e) {
      this.logger.error(
        `Failed to create token for external id${tokenData.externalId}`,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to create token'),
      );
    }
  }

  /**
   * Disallow token to different provider for current constraints
   */
  async updateToken(
    provider: OAuthProvider,
    tokenData: Partial<Omit<Token, 'id' | 'user' | 'provider'>> &
      Pick<Token, 'externalId'>,
  ): Promise<Result<Token, Error>> {
    try {
      const maybeToken = await this.getToken(tokenData.externalId, provider);

      if (maybeToken.isNothing)
        return Result.err(
          new Error(
            `Update failed as token not found for external id ${tokenData.externalId}`,
          ),
        );

      this.logger.log(
        `Updating token for external id ${tokenData.externalId} and provider ${provider}`,
      );
      const updatedToken = await this.tokenRepository.save({
        ...maybeToken.value,
        ...tokenData,
      });

      return Result.ok(updatedToken);
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Token update failed with unknown error';
      this.logger.error(
        `Failed to update token for user with external Id ${tokenData.externalId}`,
        errorMessage,
      );
      return Result.err(new Error(errorMessage));
    }
  }
}

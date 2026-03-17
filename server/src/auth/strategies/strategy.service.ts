import { BadRequestException, Injectable } from '@nestjs/common';
import { OAuthStrategy } from './strategy.interface';
import { GoogleOAuthStrategyService } from './google/google-strategy.service';
import { OAuthProvider } from '../auth.types';

@Injectable()
export class OAuthStrategyService {
  constructor(
    private readonly googleOAuthStrategy: GoogleOAuthStrategyService,
  ) {}

  private assertExhaustive(value: never): never {
    /**
     * Wrap never in value as workaround to prevent lint errors
     * Cannot pass never value to a temeplate literal
     */
    throw new BadRequestException(
      `Unsupported OAuth provider: ${String(value)}`,
    );
  }

  getStrategy(provider: OAuthProvider): OAuthStrategy {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return this.googleOAuthStrategy;
      default:
        return this.assertExhaustive(provider);
    }
  }
}

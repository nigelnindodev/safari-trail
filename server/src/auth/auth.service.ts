import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuthStrategyService } from './strategies/strategy.service';
import { randomBytes } from 'node:crypto';
import { OAuthProvider } from './auth.types';
import { RedisService } from 'src/redis';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from 'src/constants';
import {
  OAuthTokenWithRefresh,
  OAuthUserInfo,
} from './strategies/strategy.interface';
import { Result } from 'true-myth';
import { lastValueFrom } from 'rxjs';
import { User } from 'src/users/entity/user.entity';
import { AuthRepository } from './user.repository';
import { CryptoService } from 'src/security/crypto/crypto.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly STATE_TTL = 600; // 10 minutes

  constructor(
    private readonly oAuthStrategyService: OAuthStrategyService,
    private readonly authRepository: AuthRepository,
    private readonly cryptoService: CryptoService,
    private readonly redisService: RedisService,
    @Inject(USER_SERVICE) private readonly usersClient: ClientProxy,
  ) {}

  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  private generateStateKey(state: string): string {
    return `oauth_state:${state}`;
  }

  async initiateOAuth(provider: OAuthProvider): Promise<{ authUrl: string }> {
    const strategy = this.oAuthStrategyService.getStrategy(provider);
    const state = this.generateState();

    await this.redisService.setWithExpiry(
      this.generateStateKey(state),
      provider,
      this.STATE_TTL,
    );

    return { authUrl: strategy.getAuthorizationUrl(state) };
  }

  async handleOAuthCallback({
    provider,
    code,
    state,
  }: {
    provider: OAuthProvider;
    code: string;
    state: string;
  }) {
    const maybeStoredProvider = await this.redisService.get(
      this.generateStateKey(state),
    );

    const isStateValid = maybeStoredProvider.match({
      Nothing: () => false,
      Just: (storedValue) => (storedValue as OAuthProvider) === provider,
    });

    if (!isStateValid) {
      this.logger.error('Invalid or expired state provided', { provider });
      throw new UnauthorizedException('Invalid OAuth state provided');
    }

    await this.redisService.delete(this.generateStateKey(state));

    const strategy = this.oAuthStrategyService.getStrategy(provider);

    this.logger.log('Exchanging code for tokens', { provider });

    const tokenResult: Result<OAuthTokenWithRefresh, Error> =
      await strategy.exchangeCodeForTokens(code);
    if (tokenResult.isErr) {
      this.logger.error('Token exchange failed', {
        provider,
        error: tokenResult.error,
      });
      throw new UnauthorizedException(
        `Failed to authenticate with provider: ${provider}`,
      );
    }

    this.logger.log('Fetching user information', { provider });

    const userInfoResult: Result<OAuthUserInfo, Error> =
      await strategy.getUserInformation(tokenResult.value.accessToken);
    if (userInfoResult.isErr) {
      this.logger.error('Get user information failed', {
        provider,
        errorMessage: userInfoResult.error.message,
      });
      throw new UnauthorizedException(
        `Failed to retrieve user information from provider: ${provider}`,
      );
    }
    const userInfo = userInfoResult.value;

    try {
      this.logger.log(
        'Sending and start synchronous wait for get_or_create_user',
        { email: userInfo.email, provider },
      );
      const user = await lastValueFrom<User>(
        this.usersClient.send<User>(
          { cmd: 'get_or_create_user' },
          {
            email: userInfo.email,
            name: userInfo.name,
          },
        ),
      );
      this.logger.log('Received result for get_or_create_user', {
        email: userInfo.email,
      });

      const maybeExistingToken = await this.authRepository.getToken(
        user.externalId,
        provider,
      );

      const upsertTokenResult = await maybeExistingToken.match({
        Just: () => {
          this.logger.log('Updating existing token', {
            externalId: user.externalId,
          });
          return this.authRepository.updateToken(provider, {
            externalId: user.externalId,
            encryptedToken: this.cryptoService
              .encrypt(tokenResult.value.refreshToken)
              .match({
                Ok: (encryptedString) => encryptedString,
                Err: (error) => {
                  this.logger.log(
                    'Failed to update existing token for user due to encryption error: ',
                    { error },
                  );
                  throw new InternalServerErrorException(
                    'Could not complete user verification at this time',
                  );
                },
              }),
          });
        },
        Nothing: () => {
          this.logger.log('Updating existing token', {
            externalId: user.externalId,
          });
          return this.authRepository.createToken({
            externalId: user.externalId,
            provider,
            encryptedToken: this.cryptoService
              .encrypt(tokenResult.value.refreshToken)
              .match({
                Ok: (encryptedString) => encryptedString,
                Err: (error) => {
                  this.logger.log(
                    'Failed to update existing token for user due to encryption error: ',
                    { error },
                  );
                  throw new InternalServerErrorException(
                    'Could not complete user verification at this time',
                  );
                },
              }),
          });
        },
      });

      if (upsertTokenResult.isErr) {
        this.logger.error(`Failed to save token for user${user.externalId}`, {
          externalId: user.externalId,
          error: upsertTokenResult.error,
        });
        throw new InternalServerErrorException(
          'Could not complete user verification at this time',
        );
      }

      this.logger.log('Auth success for user, generate session token', {
        email: user.email,
      });

      return {
        externalId: user.externalId,
        email: user.email,
      };
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      this.logger.error('Microservice error', { error });

      throw new InternalServerErrorException(
        'Could not complete user verification at this time',
      );
    }
  }
}

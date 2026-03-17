import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config';
import {
  OAuthStrategy,
  OAuthToken,
  OAuthTokenWithRefresh,
  OAuthUserInfo,
} from '../strategy.interface';
import { OAuthProvider } from 'src/auth/auth.types';
import { Result } from 'true-myth';
import {
  GoogleGetTokenErrorResponse,
  GoogleGetTokenResponse,
  GoogleGetUserInfoErrorResponse,
  GoogleGetUserInfoResponse,
} from './types';
import pRetry from 'p-retry';

@Injectable()
export class GoogleOAuthStrategyService implements OAuthStrategy {
  readonly providerName: OAuthProvider = OAuthProvider.GOOGLE;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly scopes: string[];

  private readonly logger = new Logger(GoogleOAuthStrategyService.name);

  constructor(private readonly appConfigService: AppConfigService) {
    this.clientId = appConfigService.googleOAuthConfiguration.clientId;
    this.clientSecret = appConfigService.googleOAuthConfiguration.clientSecret;
    this.callbackUrl = `${appConfigService.serverBaseUrl}/auth/validate/${this.providerName}`;
    this.scopes = ['email', 'profile'];
  }

  getAuthorizationUrl(state: string): string {
    this.logger.log('Request received to get authorization url');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.callbackUrl);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', this.scopes.join(' '));
    url.searchParams.append('state', state);
    url.searchParams.append('access_type', 'offline');
    url.searchParams.append('prompt', 'consent');

    return url.toString();
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<Result<OAuthTokenWithRefresh, Error>> {
    this.logger.log('Exchanging authorization code for tokens');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.callbackUrl,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorResponse =
          (await response.json()) as GoogleGetTokenErrorResponse;
        const errorMessage = `${errorResponse.error} [${errorResponse.error_description || 'missing error description'}]`;
        this.logger.error('Token exchange HTTP request failed', {
          status: response.status,
          error: errorMessage,
        });
        return Result.err(new Error(errorMessage));
      }

      const data = (await response.json()) as GoogleGetTokenResponse;

      if (data.refresh_token === null || data.refresh_token === undefined) {
        const errorMessage = `Refresh token missing in get token response for provider ${this.providerName}. Check access_type in authorization url`;
        this.logger.error(errorMessage);
        return Result.err(new Error(errorMessage));
      }

      this.logger.log('Successfully exchanged authorization code for tokens');
      return Result.ok({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
      });
    } catch (e) {
      const error: Error = e instanceof Error ? e : new Error('Unknown error');
      this.logger.error('Token exchange failed', { error });
      return Result.err(e);
    }
  }

  /**
   * Saw this particular endpoint have intermittent failures on local testing.
   * Suspect network issues, so use pRetry for exponential backoff
   */
  async getUserInformation(
    accessToken: string,
  ): Promise<Result<OAuthUserInfo, Error>> {
    const getUserInformationRetry = async () => {
      const result = await this.unsafeGetUserInformation(accessToken);
      if (result.isErr) throw result.error;
      return result;
    };

    let userInfo: OAuthUserInfo;

    try {
      const userInfoResult = await pRetry(getUserInformationRetry, {
        retries: 5,
        minTimeout: 300,
        maxTimeout: 2000,
        factor: 2,
      });
      userInfo = userInfoResult.value;
      return Result.ok(userInfo);
    } catch (e) {
      const error: Error = e instanceof Error ? e : new Error('Unknown error');
      this.logger.error(`Failed to retrieve user information after retries`, {
        error,
        errorMessage: error.message,
      });
      return Result.err(e);
    }
  }

  private async unsafeGetUserInformation(
    accessToken: string,
  ): Promise<Result<OAuthUserInfo, Error>> {
    this.logger.log('Fetching user information');

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        const errorResponse =
          (await response.json()) as GoogleGetUserInfoErrorResponse;
        const errorMessage = `${errorResponse.error.status} [${errorResponse.error.message || 'missing error message'}]`;
        this.logger.error('Fetch user information HTTP request failed', {
          status: response.status,
          httpErrorResponse: errorResponse,
        });
        return Result.err(new Error(errorMessage));
      }

      const data = (await response.json()) as GoogleGetUserInfoResponse;

      this.logger.log('Successfully fetched user information');
      return Result.ok({
        providerName: this.providerName,
        email: data.email,
        name: data.name,
      });
    } catch (e) {
      const error: Error = e instanceof Error ? e : new Error('Unknown error');
      this.logger.error(`Fetch user information failed'}`, {
        error,
      });
      return Result.err(error);
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<Result<OAuthToken, Error>> {
    this.logger.log('refreshing access token');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorResponse =
          (await response.json()) as GoogleGetTokenErrorResponse;
        const errorMessage = `${errorResponse.error} [${errorResponse.error_description || 'missing error description'}]`;
        this.logger.error('Refresh token exchange HTTP request failed', {
          status: response.status,
          error: errorMessage,
        });
        return Result.err(new Error(errorMessage));
      }

      const data = (await response.json()) as GoogleGetTokenResponse;

      this.logger.log('Successfully refreshed access token');
      return Result.ok({
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      });
    } catch (e) {
      const error: Error = e instanceof Error ? e : new Error('Unknown error');
      this.logger.error('Refresh token exchange failed', { error });
      return Result.err(error);
    }
  }
}

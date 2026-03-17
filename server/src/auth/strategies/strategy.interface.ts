import { Result } from 'true-myth';

export interface OAuthToken {
  accessToken: string;
  expiresIn?: number;
}

export interface OAuthTokenWithRefresh extends OAuthToken {
  refreshToken: string;
}

export interface OAuthUserInfo {
  providerName: string;
  email: string;
  name: string;
}

export interface OAuthStrategy {
  readonly providerName: string;

  getAuthorizationUrl(state: string): string;

  exchangeCodeForTokens(
    code: string,
  ): Promise<Result<OAuthTokenWithRefresh, Error>>;

  refreshAccessToken(refreshToken: string): Promise<Result<OAuthToken, Error>>;

  getUserInformation(
    accessToken: string,
  ): Promise<Result<OAuthUserInfo, Error>>;
}

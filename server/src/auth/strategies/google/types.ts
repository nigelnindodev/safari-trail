export type GoogleGetTokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export type GoogleGetTokenErrorResponse = {
  error: string;
  error_description?: string;
};

export type GoogleGetUserInfoResponse = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
};

export type GoogleGetUserInfoErrorResponse = {
  error: {
    code: number;
    message: string;
    status: string;
  };
};

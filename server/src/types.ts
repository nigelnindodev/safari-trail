export type JwtPayload = {
  sub: string; // equal to users externalId
  email: string;
  iat: number;
  exp: number;
};

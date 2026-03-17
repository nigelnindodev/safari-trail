import { GamingPlatform } from './platforms';

export interface User {
  externalId: string;
  email: string;
  name: string;
  profile: {
    bio?: string;
    avatarUrl?: string;
    platforms?: GamingPlatform[];
  };
}

export interface UpdateProfileDto {
  bio?: string;
  avatarUrl?: string;
  platforms?: GamingPlatform[];
}

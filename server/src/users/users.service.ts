import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { ExternalUserDetailsDto, GetOrCreateUserDto } from './dto/user.dto';
import { User } from './entity/user.entity';
import { Maybe, Result } from 'true-myth';
import { UserProfileRepository } from './user-profile.repository';
import { UserProfile } from './entity/profile.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  async createUser(data: GetOrCreateUserDto): Promise<Maybe<User>> {
    const result = await this.userRepository.createUser(data);

    if (result.isErr) {
      this.logger.error('Failed to create user', {
        email: data.email,
        error: result.error,
      });
      return Maybe.nothing();
    }

    return Maybe.of(result.value);
  }

  async getUserProfile(
    externalId: string,
  ): Promise<Maybe<ExternalUserDetailsDto>> {
    const maybeUserProfileWithUser =
      await this.userProfileRepository.findByExternalIdWithUser(externalId);
    return maybeUserProfileWithUser.map((userProfileWithUser) => {
      return {
        ...userProfileWithUser.user,
        profile: userProfileWithUser,
      };
    });
  }

  async getOrCreateUser({
    email,
    name,
  }: {
    email: string;
    name: string;
  }): Promise<Maybe<User>> {
    const maybeUser = await this.userRepository.findByEmail(email);

    return await maybeUser.match({
      Just: async (user) => {
        await this.ensureUserProfile(user.externalId, 'existing user');
        return Maybe.of(user);
      },
      Nothing: async () => {
        const maybeNewUser = await this.createUser({ email, name });

        if (maybeNewUser.isJust) {
          await this.ensureUserProfile(
            maybeNewUser.value.externalId,
            'new user',
          );
        }

        return maybeNewUser;
      },
    });
  }

  async updateUser(
    data: Partial<Omit<UserProfile, 'id' | 'externalId'>> &
      Pick<UserProfile, 'externalId'>,
  ): Promise<Maybe<ExternalUserDetailsDto>> {
    this.logger.log('Processing update details request for user', {
      externalId: data.externalId,
    });

    const result = await this.userProfileRepository.updateUserProfile(data);

    if (result.isErr) {
      this.logger.error(`Update for user profile failed`, {
        externalId: data.externalId,
        error: result.error,
      });
      return Maybe.nothing();
    }

    // We need additional query to merge with user entity here
    const maybeUserProfileWithUser =
      await this.userProfileRepository.findByExternalIdWithUser(
        data.externalId,
      );
    return maybeUserProfileWithUser.map((userProfileWithUser) => {
      return {
        ...userProfileWithUser.user,
        profile: userProfileWithUser,
      };
    });
  }

  private async ensureUserProfile(
    externalId: string,
    context: string,
  ): Promise<void> {
    const profileResult = await this.getOrCreateUserProfile(externalId);

    profileResult.match({
      Ok: () => {},
      Err: () => {
        this.logger.warn(`Failed to create user profile for ${context}`, {
          externalId,
        });
      },
    });
  }

  private async getOrCreateUserProfile(
    externalId: string,
  ): Promise<Result<UserProfile, Error>> {
    const maybeUserProfile =
      await this.userProfileRepository.findByExternalId(externalId);
    return await maybeUserProfile.match({
      Just: (userProfile) => Promise.resolve(Result.ok(userProfile)),
      Nothing: async () => {
        const createUserProfileResult =
          await this.userProfileRepository.createUserProfile({ externalId });
        return createUserProfileResult.match({
          Ok: (userProfile) => Promise.resolve(Result.ok(userProfile)),
          Err: (e) => {
            this.logger.error('Failed to create user profile', { externalId });
            return Promise.resolve(Result.err(e));
          },
        });
      },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfile } from './entity/profile.entity';
import { Repository } from 'typeorm';
import { Maybe, Result } from 'true-myth';

@Injectable()
export class UserProfileRepository {
  private readonly logger = new Logger(UserProfileRepository.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async findById(id: number): Promise<Maybe<UserProfile>> {
    return Maybe.of(await this.userProfileRepository.findOneBy({ id }));
  }

  async findByExternalId(externalId: string): Promise<Maybe<UserProfile>> {
    return Maybe.of(await this.userProfileRepository.findOneBy({ externalId }));
  }

  async findByExternalIdWithUser(
    externalId: string,
  ): Promise<Maybe<UserProfile>> {
    const userProfile = await this.userProfileRepository.findOne({
      where: { externalId },
      relations: ['user'],
    });

    return Maybe.of(userProfile);
  }

  async createUserProfile(
    userProfileData: Omit<
      UserProfile,
      'id' | 'createdAt' | 'updatedAt' | 'user'
    >,
  ): Promise<Result<UserProfile, Error>> {
    this.logger.log(
      `Attempting to create user profile for external id ${userProfileData.externalId}`,
    );
    try {
      const userProfile = this.userProfileRepository.create(userProfileData);
      const savedUserProfile =
        await this.userProfileRepository.save(userProfile);
      return Result.ok(savedUserProfile);
    } catch (e) {
      this.logger.error(
        `Failed to create user profile with external id ${userProfileData.externalId}`,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error(
              `Failed to create user profile for external id ${userProfileData.externalId}`,
            ),
      );
    }
  }

  async updateUserProfile(
    userProfileData: Partial<Omit<UserProfile, 'id' | 'externalId'>> &
      Pick<UserProfile, 'externalId'>,
  ): Promise<Result<UserProfile, Error>> {
    this.logger.log(
      `Attempting to update user profile for external id ${userProfileData.externalId}`,
    );
    try {
      const maybeUserProfile = await this.findByExternalId(
        userProfileData.externalId,
      );

      if (maybeUserProfile.isNothing)
        return Result.err(
          new Error(
            `Cannot find user profile with external id ${userProfileData.externalId} for update`,
          ),
        );

      const updatedUser = await this.userProfileRepository.save({
        ...maybeUserProfile.value,
        ...userProfileData,
      });
      return Result.ok(updatedUser);
    } catch (e) {
      this.logger.error(
        `Failed to update user profile with external id ${userProfileData.externalId}`,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error(
              `Failed to update user profile for external id ${userProfileData.externalId}`,
            ),
      );
    }
  }
}

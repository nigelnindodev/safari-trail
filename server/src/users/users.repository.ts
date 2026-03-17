import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Maybe, Result } from 'true-myth';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<Maybe<User>> {
    return Maybe.of(await this.userRepository.findOneBy({ id }));
  }

  async findByEmail(email: string): Promise<Maybe<User>> {
    const user = await this.userRepository.findOneBy({ email });
    return Maybe.of(user);
  }

  async findByExternalId(externalId: string): Promise<Maybe<User>> {
    return Maybe.of(await this.userRepository.findOneBy({ externalId }));
  }

  async createUser(
    userData: Omit<User, 'id' | 'externalId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<User, Error>> {
    this.logger.log(
      `Attempting to create new user with email ${userData.email}`,
    );
    try {
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);

      this.logger.log(`Created new user with email ${userData.email}`);
      return Result.ok(savedUser);
    } catch (e) {
      this.logger.error(
        `Failed to create user with email ${userData.email}`,
        e,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error(`Failed to create user for email ${userData.email}`),
      );
    }
  }
}

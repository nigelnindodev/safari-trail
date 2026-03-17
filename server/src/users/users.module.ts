import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './http/users.controller';
import { UsersMicroserviceController } from './microservice/users-microservice.controller';
import { UsersClientModule } from './users-client.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UsersRepository } from './users.repository';
import { UserProfileRepository } from './user-profile.repository';
import { UserProfile } from './entity/profile.entity';
import { SecurityModule } from 'src/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),
    SecurityModule,
    UsersClientModule,
  ],
  providers: [UsersService, UsersRepository, UserProfileRepository],
  controllers: [UsersController, UsersMicroserviceController],
})
export class UsersModule {}

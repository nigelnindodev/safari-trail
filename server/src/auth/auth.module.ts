import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersClientModule } from 'src/users/users-client.module';
import { StrategiesModule } from './strategies/strategies.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './entity/tokens.entity';
import { AuthRepository } from './user.repository';
import { SecurityModule } from 'src/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    SecurityModule,
    StrategiesModule,
    UsersClientModule,
  ],
  providers: [AuthService, AuthRepository],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}

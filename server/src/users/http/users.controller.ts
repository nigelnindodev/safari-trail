import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ExternalUserDetailsDto, UpdateUserProfileDto } from '../dto/user.dto';
import { UsersService } from '../users.service';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from 'src/auth/decorators/current-user-decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/security/guards/jwt-auth-guard';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile details',
    type: ExternalUserDetailsDto,
  })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  @ApiTags('user')
  async getUser(@CurrentUser('sub') externalId: string) {
    this.logger.log('Received request to fetch user profile', { externalId });

    const maybeUserProfileDetails =
      await this.userService.getUserProfile(externalId);

    if (maybeUserProfileDetails.isNothing) {
      const errorMessage = `User details with external id ${externalId} not found`;
      this.logger.warn('User details not found', { externalId });
      throw new NotFoundException(errorMessage);
    }

    return plainToInstance(
      ExternalUserDetailsDto,
      maybeUserProfileDetails.value,
      {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    );
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile',
    type: ExternalUserDetailsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User profile update request malformed',
  })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  @ApiTags('user')
  async updateUser(
    @CurrentUser('sub') externalId: string,
    @Body() updateUserDto: UpdateUserProfileDto,
  ) {
    this.logger.log('Received request to update user profile', { externalId });

    const maybeUser = await this.userService.updateUser({
      ...updateUserDto,
      ...{ externalId },
    });

    if (maybeUser.isNothing) {
      const message = `Update failed. User with external id ${externalId} not found`;
      this.logger.warn('Update failed. User not found', { externalId });
      throw new NotFoundException(message);
    }

    // Clean this up, we've created a new UserProfile entity
    return plainToInstance(ExternalUserDetailsDto, maybeUser.value, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}

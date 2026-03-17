import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { GamingPlatforms } from '../user.types';
import { ApiProperty } from '@nestjs/swagger';

export class GetOrCreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(GamingPlatforms, { each: true })
  platforms?: GamingPlatforms[];
}

export class UserProfileDto {
  @Expose()
  externalId: string;

  @Expose()
  @IsOptional()
  bio?: string;

  @Expose()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @Expose()
  @IsOptional()
  @ApiProperty({
    description: 'The gaming platforms the user plays on',
    enum: GamingPlatforms,
    isArray: true,
    example: [
      GamingPlatforms.PC,
      GamingPlatforms.PLAYSTATION,
      GamingPlatforms.NINTENDO,
    ],
  })
  platforms?: GamingPlatforms[];
}

@Exclude()
export class ExternalUserDetailsDto {
  @Expose()
  externalId: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto | null;
}

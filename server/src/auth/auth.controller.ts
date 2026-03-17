import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCallbackDto } from './dto/auth-callback.dto';
import { OAuthProvider } from './auth.types';
import { Response } from 'express';
import { AppConfigService } from 'src/config';
import { AUTH_COOKIE_NAME } from 'src/constants';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtService } from 'src/security/jwt/jwt.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  @Get('login/:provider')
  @ApiOperation({ summary: 'Initiate OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to third party OAuth login flow',
  })
  @ApiTags('auth')
  async login(@Param('provider') provider: string, @Res() res: Response) {
    this.logger.log(`Received log in request`, { provider });
    const parsedProvider = this.parseProvider(provider);
    const initiateAuthResponse =
      await this.authService.initiateOAuth(parsedProvider);
    return res.redirect(initiateAuthResponse.authUrl);
  }

  @Get('validate/:provider')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )
  @ApiOperation({ summary: 'Initiate OAuth validation' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to user profile on success',
  })
  @ApiTags('auth')
  async validate(
    @Param('provider') provider: string,
    @Query('') query: AuthCallbackDto,
    @Res() res: Response,
  ) {
    const parsedProvider = this.parseProvider(provider);

    const result = await this.authService.handleOAuthCallback({
      provider: parsedProvider,
      code: query.code,
      state: query.state,
    });

    this.logger.log('Signing JWT token for user', {
      externalId: result.externalId,
    });
    const token = this.jwtService.sign({
      sub: result.externalId,
      email: result.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: this.jwtService.tokenExpiryInSeconds * 1000,
    });

    res.redirect(`${this.config.clientBaseUrl}/user/profile`);
  }

  private parseProvider(provider: string): OAuthProvider {
    if (!Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
      throw new BadRequestException(`Invalid OAuth provider: ${provider}`);
    }
    return provider as OAuthProvider;
  }
}

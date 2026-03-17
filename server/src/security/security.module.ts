import { Module } from '@nestjs/common';
import { JwtService } from './jwt/jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { CryptoService } from './crypto/crypto.service';

@Module({
  providers: [CryptoService, JwtService, JwtAuthGuard],
  exports: [CryptoService, JwtService, JwtAuthGuard],
})
export class SecurityModule {}

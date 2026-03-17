import { Module } from '@nestjs/common';
import { GoogleOAuthStrategyService } from './google-strategy.service';

@Module({
  providers: [GoogleOAuthStrategyService],
  exports: [GoogleOAuthStrategyService],
})
export class GoogleModule {}

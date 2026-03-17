import { Module } from '@nestjs/common';
import { OAuthStrategyService } from './strategy.service';
import { GoogleModule } from './google/google.module';

@Module({
  imports: [GoogleModule],
  providers: [OAuthStrategyService],
  exports: [OAuthStrategyService],
})
export class StrategiesModule {}

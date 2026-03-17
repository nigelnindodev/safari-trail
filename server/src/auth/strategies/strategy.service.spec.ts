import { Test, TestingModule } from '@nestjs/testing';
import { OAuthStrategyService } from './strategy.service';

describe('StrategyService', () => {
  let service: OAuthStrategyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OAuthStrategyService],
    }).compile();

    service = module.get<OAuthStrategyService>(OAuthStrategyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

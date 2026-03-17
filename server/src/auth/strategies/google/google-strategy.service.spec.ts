import { Test, TestingModule } from '@nestjs/testing';
import { GoogleOAuthStrategyService } from './google-strategy.service';

describe('GoogleStrategyService', () => {
  let service: GoogleOAuthStrategyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleOAuthStrategyService],
    }).compile();

    service = module.get<GoogleOAuthStrategyService>(
      GoogleOAuthStrategyService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

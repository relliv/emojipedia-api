import { Test, TestingModule } from '@nestjs/testing';
import { UnicodeService } from './unicode.service';

describe('UnicodeService', () => {
  let service: UnicodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnicodeService],
    }).compile();

    service = module.get<UnicodeService>(UnicodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

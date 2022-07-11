import { Test, TestingModule } from '@nestjs/testing';
import { UnicodeController } from './unicode.controller';

describe('UnicodeController', () => {
  let controller: UnicodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnicodeController],
    }).compile();

    controller = module.get<UnicodeController>(UnicodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

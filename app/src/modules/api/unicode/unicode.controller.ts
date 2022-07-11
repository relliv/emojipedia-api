import { Controller, Get } from '@nestjs/common';

@Controller('unicode')
export class UnicodeController {
  @Get()
  getHello(): string {
    return 'api starts here';
  }
}

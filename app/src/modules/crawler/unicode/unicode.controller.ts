import { HttpService } from '@nestjs/axios';
import { Controller } from '@nestjs/common';

@Controller('unicode')
export class UnicodeController {
  constructor(private readonly httpService: HttpService) {}
}

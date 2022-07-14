import { Controller, Get } from '@nestjs/common';
import { UnicodeService } from 'src/modules/crawler/unicode/unicode.service';

@Controller()
export class GroupController {
  constructor(private readonly unicodeService: UnicodeService) {}

  @Get('')
  public async getGroups() {
    return {};
  }
}

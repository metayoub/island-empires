import { Body, Controller, Post } from '@nestjs/common';
import { ContactSupportDto } from './dto/contact-support.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('contact')
  contact(@Body() body: ContactSupportDto) {
    return this.supportService.contact(body);
  }
}

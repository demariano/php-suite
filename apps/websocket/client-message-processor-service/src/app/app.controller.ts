import { Body, Controller, Post } from '@nestjs/common';

import { BroadcastMessageDto } from "@dto";
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }


  @Post()
  handleMessage(@Body() data: BroadcastMessageDto) {
    return this.appService.handleMessage(data);
  }
}

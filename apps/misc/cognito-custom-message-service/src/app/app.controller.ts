import { Body, Controller, Post } from '@nestjs/common';

import { ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}


  @Post()
  @ApiBody({ type: Object })
  handleMessage(@Body() body: unknown) {
    return this.appService.handleMessage(body);
  }
}

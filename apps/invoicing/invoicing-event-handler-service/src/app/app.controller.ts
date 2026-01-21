import { Body, Controller, Get, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { ApiBody } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}


  @Post()
  @ApiBody({ type: Object })
  handleMessage(@Body() body: any) {
    return this.appService.handleMessage(body);
  }
}

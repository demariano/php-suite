import { Body, Controller, Post } from '@nestjs/common';

import { BroadcastMessageDto } from '@dto';
import { LocalWebsocketService } from './local.websocket.service';

@Controller()
export class AppController {
  constructor(private readonly lol: LocalWebsocketService) { }


  @Post()
  handleMessage(@Body() body: BroadcastMessageDto) {
    return this.lol.emitMessageToClient(body);
  }
}

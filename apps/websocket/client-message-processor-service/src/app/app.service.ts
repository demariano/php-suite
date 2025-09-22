
import { BroadcastMessageDto } from "@dto";
import { Injectable, Logger } from '@nestjs/common';
import { MessageHandlerService } from './message.handler.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly messageHandlerService: MessageHandlerService) { }

  async handleMessage(data: BroadcastMessageDto) {

    this.messageHandlerService.handleMessage(data);

    //process message 

    return;


  }
}

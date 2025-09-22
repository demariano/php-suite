import { Injectable, Logger } from '@nestjs/common';
import { MessageHandlerService } from './message.handler.service';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private readonly messageHandlerService: MessageHandlerService) {}

    async handleMessage(event: any) {
        this.logger.log(`event: ${JSON.stringify(event)}`);
        await this.messageHandlerService.handleMessage(event);
    }
}

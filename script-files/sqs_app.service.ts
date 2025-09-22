
import { Injectable, Logger } from '@nestjs/common';
import { MessageHandlerService } from './message.handler.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly messageHandlerService: MessageHandlerService) { }

  async handleMessage(records: any) {
    this.logger.log(`Record Value: ${JSON.stringify(records)}`);


    for (const record of records) {

      try {
        this.logger.log(`Processing SQS Message: ${JSON.stringify(record)}`);

        await this.messageHandlerService.handleMessage(record.body);


      } catch (error) {
        this.logger.error(`Error processing SQS Message: ${JSON.stringify(error)}`);
      }


    }
  }
}

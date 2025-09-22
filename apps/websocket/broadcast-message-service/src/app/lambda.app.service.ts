import { Injectable, Logger } from '@nestjs/common';
import { AwsWebsocketBroadcastHandler } from './aws/aws.websocket.broadcast.handler';

@Injectable()
export class LambdaAppService {
    private readonly logger = new Logger(LambdaAppService.name);

    constructor(private readonly awsWebsocketBroadcastHandler: AwsWebsocketBroadcastHandler) {}

    async handleMessage(records: any) {
        for (const record of records) {
            try {
                this.logger.log(`Processing SQS Message: ${JSON.stringify(record)}`);

                await this.awsWebsocketBroadcastHandler.handleMessage(record.body);
            } catch (error) {
                this.logger.error(error);
                this.logger.error(`Error processing SQS Message: ${JSON.stringify(error)}`);
            }
        }
    }
}

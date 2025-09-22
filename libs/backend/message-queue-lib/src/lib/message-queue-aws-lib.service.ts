import { AwsSqsLibService } from '@aws-sqs-lib';
import { ResponseDto } from '@dto';
import { Injectable } from '@nestjs/common';
import { MessageQueueServiceAbstract } from './message-queue-abstract-class';

@Injectable()
export class MessageQueueAwsLibService implements MessageQueueServiceAbstract {
    constructor(
        private readonly awsSqsLibService: AwsSqsLibService) { }

    async sendMessageToSQS(destination: string, message: string): Promise<ResponseDto<string>> {

        await this.awsSqsLibService.sendMessage(destination, message);

        return new ResponseDto(`Message sent to queue ${destination}`, 200);
    }
}

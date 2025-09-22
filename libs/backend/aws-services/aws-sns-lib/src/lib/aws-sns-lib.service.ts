import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsSnsLibService {
    
    private readonly snsClient: SNSClient;

    private readonly logger = new Logger(AwsSnsLibService.name);
    constructor(private readonly configService: ConfigService) {
        this.snsClient = new SNSClient({
            region: this.configService.get<string>('DEFAULT_REGION'),
        });
    }

    async sendMessage(snsArn: string,  messageGroupId: string, messageDeduplicationId: string, data: string) {

        this.logger.log(`Sending message to sns ${snsArn}`);

        const params = {
            Message: data,
            TopicArn: snsArn,
            MessageGroupId: messageGroupId,
            MessageDeduplicationId: messageDeduplicationId,
        };

        try {
            const command = new PublishCommand(params);
            await this.snsClient.send(command);
            this.logger.log('Message sent to SNS topic successfully');
        } catch (error) {
            this.logger.error('Failed to send message to SNS FIFO topic', error);
            throw error;
        }


    }


}

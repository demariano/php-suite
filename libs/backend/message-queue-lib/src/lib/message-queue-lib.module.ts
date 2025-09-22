import { AwsSqsLibModule, AwsSqsLibService } from '@aws-sqs-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { MessageQueueAwsLibService } from './message-queue-aws-lib.service';


@Module({
  imports: [AwsSqsLibModule, ConfigurationLibModule],
  providers: [MessageQueueAwsLibService, AwsSqsLibService],
  exports: [MessageQueueAwsLibService, AwsSqsLibService],
})
export class MessageQueueLibModule { }

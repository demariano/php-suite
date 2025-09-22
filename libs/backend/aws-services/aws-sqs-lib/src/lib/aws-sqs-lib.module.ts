import { Module } from '@nestjs/common';
import { AwsSqsLibService } from './aws-sqs-lib.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [AwsSqsLibService],
  exports: [AwsSqsLibService],
})
export class AwsSqsLibModule {}

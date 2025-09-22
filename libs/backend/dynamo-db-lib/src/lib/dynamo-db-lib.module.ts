import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { DynamoDbLibService } from './dynamo-db-lib.service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [
    DynamoDbLibService,
  ],
  exports: [DynamoDbLibService],
})
export class DynamoDbLibModule { }

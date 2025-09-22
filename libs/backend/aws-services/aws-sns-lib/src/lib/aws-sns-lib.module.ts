import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { AwsSnsLibService } from './aws-sns-lib.service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [AwsSnsLibService],
  exports: [AwsSnsLibService],
})
export class AwsSnsLibModule { }

import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { AwsSesLibService } from './aws-ses-lib.service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [AwsSesLibService],
  exports: [AwsSesLibService],
})
export class AwsSesLibModule { }

import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { AwsS3LibService } from './aws-s3-lib.service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [AwsS3LibService],
  exports: [AwsS3LibService],
})
export class AwsS3LibModule { }

import { Module } from '@nestjs/common';
import { AwsSecretManagerLibService } from './aws-secret-manager-lib.service';


@Module({
  imports: [],
  providers: [AwsSecretManagerLibService],
  exports: [AwsSecretManagerLibService],
})
export class AwsSecretManagerLibModule { }

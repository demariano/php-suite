import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { AwsCognitoLibService } from './aws-cognito-lib.service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [AwsCognitoLibService],
  exports: [AwsCognitoLibService],
})
export class AwsCognitoLibModule { }

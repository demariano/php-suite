import { AwsCognitoLibModule } from '@aws-cognito-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthenticationController } from './authentication.controller';
import { AdminCreateUserHandler } from './commands/admin.create.user/admin.create.user.handler';
import { ChangePasswordHandler } from './commands/change.password/change.password.handler';
import { CompleteNewPasswordHandler } from './commands/complete.new.password/complete.new.password.handler';
import { ConfirmPasswordCodeHandler } from './commands/confirm.password.code/confirm.password.code.handler';
import { ConfirmUserHandler } from './commands/confirm.user/confirm.user.handler';
import { DeleteUserHandler } from './commands/delete.user/delete.user..handler';
import { ForgotPasswordHandler } from './commands/forgot.password/forgot.password.handler';

import { AwsSesLibModule } from '@aws-ses-lib';
import { ConfigurationDatabaseService, ConfigurationDatabaseServiceModule } from '@configuration-database-service';
import { LoginHandler } from './commands/login/login.handler';
import { RefreshTokenHandler } from './commands/refresh.token/refresh.token.handler';
import { ResendConfirmationCodeHandler } from './commands/resend.confirmation.code/resend.confirmation.code.handler';
import { ResendInvitationHandler } from './commands/resend.invitation/resend.invitation.handler';
import { SignUpUserHandler } from './commands/sign.up.user/sign.up.user.handler';
import { VerifyMFACodeHandler } from './commands/verify.mfa/verify.mfa..confirmation.code.handler';

@Module({
  imports: [
    CqrsModule,
    DynamoDbLibModule,
    ConfigurationLibModule,
    MessageQueueLibModule,
    AwsCognitoLibModule,
    ConfigurationDatabaseServiceModule,
    AwsSesLibModule
  ],
  controllers: [AuthenticationController],
  providers: [
    {
      provide: 'MessageQueueAwsLibService',
      useClass: MessageQueueAwsLibService,
    },
    LoginHandler,
    CompleteNewPasswordHandler,
    ConfirmPasswordCodeHandler,
    ForgotPasswordHandler,
    AdminCreateUserHandler,
    SignUpUserHandler,
    ChangePasswordHandler,
    ConfirmUserHandler,
    DeleteUserHandler,
    ResendConfirmationCodeHandler,
    ResendInvitationHandler,
    VerifyMFACodeHandler,
    RefreshTokenHandler,
    {
      provide: 'ConfigurationDatabaseService',
      useClass: ConfigurationDatabaseService,
    },








  ],
})
export class AuthenticationModule { }

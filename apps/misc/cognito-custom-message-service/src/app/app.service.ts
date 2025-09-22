
import { EmailTemplateType } from '@dto';
import { EmailTemplateDataType } from '@dynamo-db-lib';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private configService: ConfigService,
    private readonly emailTemplateDatabaseService: EmailTemplateDatabaseService
  ) { }


  async handleMessage(event) {
    const email = await this.getEmailFromEvent(event);

    switch (event.triggerSource) {
      case 'CustomMessage_SignUp':
      case 'CustomMessage_ResendCode':
        await this.handleSignUp(event, email);
        break;
      case 'CustomMessage_ForgotPassword':
        await this.handleForgotPassword(event, email);
        break;
      case 'CustomMessage_AdminCreateUser':
      case 'CustomMessage_ResendInvitation':
        await this.handleInviteUser(event, email);
        break;
      default:
        this.logger.log(
          `No custom message is configured for triggerSource ${event.triggerSource}`
        );
    }

    return event;
  }

  async handleSignUp(event, email: string) {

    this.logger.log(`Handling sign up for ${email}`);

    const emailRecord: EmailTemplateDataType = await this.emailTemplateDatabaseService.findByTemplateTypeAndLanguage(
      EmailTemplateType.SIGN_UP,
      'ENGLISH'
    );

    if (!emailRecord) {
      this.logger.warn(`No email template found for ${EmailTemplateType.SIGN_UP} and ENGLISH`); 
      return event;
    }

    //todo implement changes necessary for specific user if needed 
    //todo replace all needed data from the template e.g. redirect url etc. 


    event.response.emailSubject = emailRecord.subject;
    event.response.emailMessage = emailRecord.data.htmlData;


    return event;
  }

  async handleForgotPassword(event, email: string) {

    this.logger.log(`Handling forgot password for ${email}`);

    const emailRecord: EmailTemplateDataType = await this.emailTemplateDatabaseService.findByTemplateTypeAndLanguage(
      EmailTemplateType.FORGOT_PASSWORD,
      'ENGLISH'
    );

    if (!emailRecord) {
      this.logger.warn(`No email template found for ${EmailTemplateType.FORGOT_PASSWORD} and ENGLISH`); 
      return event;
    }

    //todo implement changes necessary for specific user if needed 
    //todo replace all needed data from the template e.g. redirect url etc. 


    event.response.emailSubject = emailRecord.subject;
    event.response.emailMessage = emailRecord.data.htmlData;

    return event;
  }

  async handleInviteUser(event, email: string) {

    this.logger.log(`Handling invite user for ${email}`);

    const emailRecord: EmailTemplateDataType = await this.emailTemplateDatabaseService.findByTemplateTypeAndLanguage(
      EmailTemplateType.INVITATION,
      'ENGLISH'
    );

    if (!emailRecord) {
      this.logger.warn(`No email template found for ${EmailTemplateType.INVITATION} and ENGLISH`); 
      return event;
    }

    //todo implement changes necessary for specific user if needed 
    //todo replace all needed data from the template e.g. redirect url etc. 


    event.response.emailSubject = emailRecord.subject;
    event.response.emailMessage = emailRecord.data.htmlData;

    return event;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getEmailFromEvent(event: any) {
    return event.request.userAttributes.email;
  }

}

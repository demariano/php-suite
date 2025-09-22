import { EmailTemplateType } from "@dto";


export class CreateEmailTemplateCommand {
    constructor(
      public readonly language: string,
      public readonly emailTemplateType: EmailTemplateType,
      public readonly htmlData: string,
      public readonly textData: string,
      public readonly subject: string,
    ) {}
  }
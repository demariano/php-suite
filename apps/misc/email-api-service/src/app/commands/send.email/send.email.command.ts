

export class SendEmailCommand {
    constructor(
      public readonly source:string,
      public readonly toAddress:string,
      public readonly messageBodyHtmlData:string,
      public readonly messageBodyTextData:string,
      public readonly subjectData:string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      public readonly files? :any[],
      public readonly replyToAddress?:string,   
    ) {}
  }
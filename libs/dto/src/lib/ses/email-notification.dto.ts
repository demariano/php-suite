

export class EmailNotificationDto {



  replyToAddress?: string;


  source!: string;

  toAddress!: string;


  messageBodyHtmlData!: string;

  messageBodyTextData!: string;

  subjectData!: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files!: any[];


}

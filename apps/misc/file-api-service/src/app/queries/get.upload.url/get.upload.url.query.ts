export class GetUploadUrlQuery {
    constructor(public readonly bucketName: string, 
      public readonly key: string, 
      public readonly mimeType: string, 
      public readonly expiration: number ) {}
  }
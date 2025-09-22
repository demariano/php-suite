import { UserFilterDto } from "@dto";

export class GetRecordsFilterQuery {
    constructor(
      public readonly filter: UserFilterDto,
      public readonly limit: number, 
      public readonly direction :string, 
      public readonly cursorPointer: string,

    ) {}
  }
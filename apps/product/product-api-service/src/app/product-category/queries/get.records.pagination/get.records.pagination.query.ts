export class GetRecordsPaginationQuery {
    constructor(
        public readonly status: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

export class GetRecordsByTypePaginationQuery {
    constructor(
        public readonly reportType: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

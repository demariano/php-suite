export class GetProductRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

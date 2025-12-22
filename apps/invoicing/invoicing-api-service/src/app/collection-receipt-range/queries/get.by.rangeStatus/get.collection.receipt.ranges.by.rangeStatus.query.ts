export class GetCollectionReceiptRangesByRangeStatusQuery {
    constructor(
        public readonly rangeStatus: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string | undefined
    ) {}
}

export class GetCollectionReceiptRangesByAreaIdQuery {
    constructor(
        public readonly areaId: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string | undefined
    ) {}
}

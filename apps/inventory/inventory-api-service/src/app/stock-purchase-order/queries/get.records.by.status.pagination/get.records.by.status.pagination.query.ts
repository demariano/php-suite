export class GetStockPurchaseOrderRecordsByStatusPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly poStatus: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

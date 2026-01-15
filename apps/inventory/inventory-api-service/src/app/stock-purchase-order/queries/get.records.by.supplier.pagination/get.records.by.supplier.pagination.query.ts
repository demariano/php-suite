export class GetStockPurchaseOrderRecordsBySupplierPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly supplierId: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

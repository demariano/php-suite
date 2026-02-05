export class GetStockPurchaseOrderRecordsByApprovalStatusPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly status: string,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly docNo?: string
    ) {}
}

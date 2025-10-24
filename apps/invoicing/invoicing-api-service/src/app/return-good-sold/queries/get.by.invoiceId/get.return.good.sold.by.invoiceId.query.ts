export class GetReturnGoodSoldByInvoiceIdQuery {
    constructor(
        public readonly invoiceId: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

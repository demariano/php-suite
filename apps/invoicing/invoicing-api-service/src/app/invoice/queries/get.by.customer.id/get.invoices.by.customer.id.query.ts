export class GetInvoicesByCustomerIdQuery {
    constructor(
        public readonly customerId: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

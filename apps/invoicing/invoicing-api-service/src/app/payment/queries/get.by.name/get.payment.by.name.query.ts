export class GetPaymentByNameQuery {
    constructor(
        public readonly receiptNo: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}


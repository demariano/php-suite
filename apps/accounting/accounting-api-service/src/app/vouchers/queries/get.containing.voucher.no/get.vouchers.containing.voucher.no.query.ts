export class GetVouchersContainingVoucherNoQuery {
    constructor(
        public readonly limit: number,
        public readonly voucherNo: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

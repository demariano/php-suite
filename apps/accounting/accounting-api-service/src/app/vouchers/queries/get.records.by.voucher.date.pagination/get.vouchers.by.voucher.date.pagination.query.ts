export class GetVouchersByVoucherDatePaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly voucherDate: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

export class GetVouchersByVoucherDatePaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

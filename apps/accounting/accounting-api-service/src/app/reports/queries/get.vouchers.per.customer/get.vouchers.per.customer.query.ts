export class GetVouchersPerCustomerQuery {
    constructor(
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly customerId: string
    ) {}
}

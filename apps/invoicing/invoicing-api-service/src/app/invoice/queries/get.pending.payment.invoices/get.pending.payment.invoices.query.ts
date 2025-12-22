export class GetPendingPaymentInvoicesQuery {
    constructor(
        public readonly customerId: string, 
        public readonly status: string,
        public readonly contractId?: string,
        public readonly nonContractOnly?: boolean
    ) {}
}

export class GetInvoicesPerContractQuery {
    constructor(
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly contractId?: string
    ) {}
}

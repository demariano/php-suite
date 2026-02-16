export class GetInvoicesPerDateQuery {
    constructor(
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly salesTypeId?: string
    ) {}
}

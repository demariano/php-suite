export class GetInvoicePaymentStatusReportQuery {
    constructor(
        public readonly startDate: string,
        public readonly endDate: string,
        public readonly paymentStatus?: string
    ) {}
}

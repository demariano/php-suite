export class GetPendingPaymentInvoicesQuery {
    constructor(public readonly customerId: string, public readonly status: string) {}
}

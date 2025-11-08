export class GetRecordsByStatusAndSupplierQuery {
    constructor(public readonly status: string, public readonly supplierId: string) {}
}

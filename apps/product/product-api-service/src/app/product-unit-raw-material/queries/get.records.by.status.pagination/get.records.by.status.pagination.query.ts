export class GetProductUnitRawMaterialRecordsByStatusPaginationQuery {
    limit: number;
    status: string;
    productId: string;
    direction: string;
    cursorPointer: string;

    constructor(limit: number, status: string, productId: string, direction: string, cursorPointer: string) {
        this.limit = limit;
        this.status = status;
        this.productId = productId;
        this.direction = direction;
        this.cursorPointer = cursorPointer;
    }
}

export class GetProductUnitRawMaterialRecordsByProductPaginationQuery {
    limit: number;
    productId: string;
    direction: string;
    cursorPointer: string;

    constructor(limit: number, productId: string, direction: string, cursorPointer: string) {
        this.limit = limit;
        this.productId = productId;
        this.direction = direction;
        this.cursorPointer = cursorPointer;
    }
}

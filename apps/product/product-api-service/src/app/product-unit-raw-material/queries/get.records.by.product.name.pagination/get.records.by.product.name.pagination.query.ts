export class GetProductUnitRawMaterialRecordsByProductNamePaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly productName: string,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

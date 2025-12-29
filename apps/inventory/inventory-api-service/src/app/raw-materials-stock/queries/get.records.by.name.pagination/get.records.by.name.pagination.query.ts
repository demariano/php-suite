export class GetRawMaterialsStockRecordsByNamePaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string,
        public readonly name: string
    ) {}
}

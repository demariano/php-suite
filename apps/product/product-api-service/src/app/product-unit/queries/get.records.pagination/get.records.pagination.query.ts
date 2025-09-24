export class GetProductUnitRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly status: string,
        public readonly lastEvaluatedKey?: string
    ) {}
}

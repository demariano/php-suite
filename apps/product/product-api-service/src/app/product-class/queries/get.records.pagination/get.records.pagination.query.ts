export class GetProductClassRecordsPaginationQuery {
    constructor(
        public readonly limit: number,
        public readonly direction: string,
        public readonly status: string,
        public readonly lastEvaluatedKey?: string
    ) {}
}

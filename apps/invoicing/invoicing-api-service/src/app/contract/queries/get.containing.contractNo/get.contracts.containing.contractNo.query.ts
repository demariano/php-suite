export class GetContractsContainingContractNoQuery {
    constructor(
        public readonly contractNo: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}

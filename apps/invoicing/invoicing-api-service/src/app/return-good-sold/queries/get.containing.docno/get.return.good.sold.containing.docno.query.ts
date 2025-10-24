export class GetReturnGoodSoldContainingDocnoQuery {
    constructor(
        public readonly docno: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

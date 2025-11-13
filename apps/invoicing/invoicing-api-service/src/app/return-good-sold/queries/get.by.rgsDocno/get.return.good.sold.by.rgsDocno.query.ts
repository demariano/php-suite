export class GetReturnGoodSoldByRgsDocnoQuery {
    constructor(
        public readonly rgsDocno: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}


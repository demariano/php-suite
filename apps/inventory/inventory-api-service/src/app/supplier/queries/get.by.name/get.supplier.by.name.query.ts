export class GetSupplierByNameQuery {
    constructor(
        public readonly name: string,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}


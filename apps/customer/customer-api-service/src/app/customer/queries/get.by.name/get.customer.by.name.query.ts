export class GetCustomerByNameQuery {
    constructor(
        public readonly customerName: string,
        public readonly limit?: number,
        public readonly direction?: string,
        public readonly cursorPointer?: string
    ) {}
}

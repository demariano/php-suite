export class GetStockDeliveryByDocnoQuery {
    constructor(
        public readonly docno: string,
        public readonly limit: number = 10,
        public readonly direction: string = 'next',
        public readonly cursorPointer: string = ''
    ) {}
}

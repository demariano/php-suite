import { StockDeliveryFilterDto } from '@dto';

export class GetRecordsByFilterPaginationQuery {
    constructor(
        public readonly filter: StockDeliveryFilterDto,
        public readonly limit: number,
        public readonly direction: string,
        public readonly cursorPointer: string
    ) {}
}

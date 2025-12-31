import { StockFilterDto } from '@dto';

export class GetRecordsByFilterPaginationQuery {
    stockFilterDto: StockFilterDto;
    limit: number;
    direction: string;
    cursorPointer: string;

    constructor(stockFilterDto: StockFilterDto, limit: number, direction: string, cursorPointer: string) {
        this.stockFilterDto = stockFilterDto;
        this.limit = limit;
        this.direction = direction;
        this.cursorPointer = cursorPointer;
    }
}

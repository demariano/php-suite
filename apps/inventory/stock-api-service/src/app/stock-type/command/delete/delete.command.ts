import { UserCognito } from '@auth-guard-lib';
import { StockTypeDto } from '@dto';

export class DeleteStockTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockTypeDto: StockTypeDto,
        public readonly user: UserCognito
    ) {}
}

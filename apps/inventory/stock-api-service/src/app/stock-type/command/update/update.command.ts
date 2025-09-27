import { UserCognito } from '@auth-guard-lib';
import { StockTypeDto } from '@dto';

export class UpdateStockTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockTypeDto: StockTypeDto,
        public readonly user: UserCognito
    ) {}
}

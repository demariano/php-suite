import { UserCognito } from '@auth-guard-lib';
import { StockDto } from '@dto';

export class UpdateStockCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockDto: StockDto,
        public readonly user: UserCognito
    ) {}
}

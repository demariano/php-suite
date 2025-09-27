import { UserCognito } from '@auth-guard-lib';
import { StockDto } from '@dto';

export class DeleteStockCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockDto: StockDto,
        public readonly user: UserCognito
    ) {}
}

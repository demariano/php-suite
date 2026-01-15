import { UserCognito } from '@auth-guard-lib';
import { StockPurchaseOrderDto } from '@dto';

export class IncomingPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockPurchaseOrderDto: StockPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

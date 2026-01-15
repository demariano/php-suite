import { UserCognito } from '@auth-guard-lib';
import { StockPurchaseOrderDto } from '@dto';

export class DeleteDeliveredPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockPurchaseOrderDto: StockPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

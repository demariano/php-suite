import { UserCognito } from '@auth-guard-lib';
import { CreateStockPurchaseOrderDto } from '@dto';

export class CreateStockPurchaseOrderCommand {
    constructor(
        public readonly stockPurchaseOrderDto: CreateStockPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

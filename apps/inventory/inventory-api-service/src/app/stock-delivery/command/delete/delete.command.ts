import { UserCognito } from '@auth-guard-lib';
import { StockDeliveryDto } from '@dto';

export class DeleteStockDeliveryCommand {
    constructor(
        public readonly id: string,
        public readonly stockDeliveryDto: StockDeliveryDto,
        public readonly user: UserCognito
    ) {}
}

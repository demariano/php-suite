import { UserCognito } from '@auth-guard-lib';
import { CreateStockDeliveryDto } from '@dto';

export class CreateStockDeliveryCommand {
    constructor(public readonly stockDeliveryDto: CreateStockDeliveryDto, public readonly user: UserCognito) {}
}

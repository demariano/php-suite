import { UserCognito } from '@auth-guard-lib';
import { RawMaterialsPurchaseOrderDto } from '@dto';

export class IncomingPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialsPurchaseOrderDto: RawMaterialsPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

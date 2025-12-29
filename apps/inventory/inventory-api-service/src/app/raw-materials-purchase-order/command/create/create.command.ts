import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsPurchaseOrderDto } from '@dto';

export class CreateRawMaterialsPurchaseOrderCommand {
    constructor(
        public readonly rawMaterialsPurchaseOrderDto: CreateRawMaterialsPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

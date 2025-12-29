import { UserCognito } from '@auth-guard-lib';
import { RawMaterialsPurchaseOrderDto } from '@dto';

export class UpdateRawMaterialsPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialsPurchaseOrderDto: RawMaterialsPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}

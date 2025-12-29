import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialSupplierDto } from '@dto';

export class CreateRawMaterialSupplierCommand {
    constructor(
        public readonly rawMaterialSupplierDto: CreateRawMaterialSupplierDto,
        public readonly user: UserCognito
    ) {}
}

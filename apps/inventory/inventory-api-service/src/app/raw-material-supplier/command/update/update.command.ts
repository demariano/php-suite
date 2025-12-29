import { UserCognito } from '@auth-guard-lib';
import { RawMaterialSupplierDto } from '@dto';

export class UpdateRawMaterialSupplierCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialSupplierDto: RawMaterialSupplierDto,
        public readonly user: UserCognito
    ) {}
}

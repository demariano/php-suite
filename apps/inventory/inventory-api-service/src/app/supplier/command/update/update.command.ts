import { UserCognito } from '@auth-guard-lib';
import { SupplierDto } from '@dto';

export class UpdateSupplierCommand {
    constructor(
        public readonly recordId: string,
        public readonly supplierDto: SupplierDto,
        public readonly user: UserCognito
    ) {}
}


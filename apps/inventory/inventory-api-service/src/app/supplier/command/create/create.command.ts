import { UserCognito } from '@auth-guard-lib';
import { CreateSupplierDto } from '@dto';

export class CreateSupplierCommand {
    constructor(public readonly supplierDto: CreateSupplierDto, public readonly user: UserCognito) {}
}


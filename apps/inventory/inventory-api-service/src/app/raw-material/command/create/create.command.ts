import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialDto } from '@dto';

export class CreateRawMaterialCommand {
    constructor(public readonly rawMaterialDto: CreateRawMaterialDto, public readonly user: UserCognito) {}
}

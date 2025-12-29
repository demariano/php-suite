import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialUnitDto } from '@dto';

export class CreateRawMaterialUnitCommand {
    constructor(public readonly rawMaterialUnitDto: CreateRawMaterialUnitDto, public readonly user: UserCognito) {}
}

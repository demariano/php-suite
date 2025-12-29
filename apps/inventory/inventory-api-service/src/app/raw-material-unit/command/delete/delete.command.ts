import { UserCognito } from '@auth-guard-lib';
import { RawMaterialUnitDto } from '@dto';

export class DeleteRawMaterialUnitCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialUnitDto: RawMaterialUnitDto,
        public readonly user: UserCognito
    ) {}
}

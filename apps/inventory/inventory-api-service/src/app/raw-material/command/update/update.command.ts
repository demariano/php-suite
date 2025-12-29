import { UserCognito } from '@auth-guard-lib';
import { RawMaterialDto } from '@dto';

export class UpdateRawMaterialCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialDto: RawMaterialDto,
        public readonly user: UserCognito
    ) {}
}

import { UserCognito } from '@auth-guard-lib';
import { RawMaterialDto } from '@dto';

export class DeleteRawMaterialCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialDto: RawMaterialDto,
        public readonly user: UserCognito
    ) {}
}

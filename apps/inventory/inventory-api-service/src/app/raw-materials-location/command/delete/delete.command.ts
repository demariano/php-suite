import { UserCognito } from '@auth-guard-lib';
import { RawMaterialsLocationDto } from '@dto';

export class DeleteRawMaterialsLocationCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialsLocationDto: RawMaterialsLocationDto,
        public readonly user: UserCognito
    ) {}
}

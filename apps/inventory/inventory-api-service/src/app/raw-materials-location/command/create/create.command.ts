import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsLocationDto } from '@dto';

export class CreateRawMaterialsLocationCommand {
    constructor(
        public readonly rawMaterialsLocationDto: CreateRawMaterialsLocationDto,
        public readonly user: UserCognito
    ) {}
}

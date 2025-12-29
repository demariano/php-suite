import { UserCognito } from '@auth-guard-lib';
import { RawMaterialsStockDto } from '@dto';

export class UpdateRawMaterialsStockCommand {
    constructor(
        public readonly recordId: string,
        public readonly rawMaterialsStockDto: RawMaterialsStockDto,
        public readonly user: UserCognito
    ) {}
}

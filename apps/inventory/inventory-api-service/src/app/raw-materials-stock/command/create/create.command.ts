import { UserCognito } from '@auth-guard-lib';
import { CreateRawMaterialsStockDto } from '@dto';

export class CreateRawMaterialsStockCommand {
    constructor(public readonly rawMaterialsStockDto: CreateRawMaterialsStockDto, public readonly user: UserCognito) {}
}

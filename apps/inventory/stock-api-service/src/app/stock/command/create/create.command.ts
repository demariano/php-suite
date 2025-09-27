import { UserCognito } from '@auth-guard-lib';
import { CreateStockDto } from '@dto';

export class CreateStockCommand {
    constructor(public readonly stockDto: CreateStockDto, public readonly user: UserCognito) {}
}

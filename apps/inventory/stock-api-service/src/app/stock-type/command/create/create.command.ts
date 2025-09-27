import { UserCognito } from '@auth-guard-lib';
import { CreateStockTypeDto } from '@dto';

export class CreateStockTypeCommand {
    constructor(public readonly stockTypeDto: CreateStockTypeDto, public readonly user: UserCognito) {}
}

import { UserCognito } from '@auth-guard-lib';
import { CreateSalesTypeDto } from '@dto';

export class CreateSalesTypeCommand {
    constructor(public readonly salesTypeDto: CreateSalesTypeDto, public readonly user: UserCognito) {}
}

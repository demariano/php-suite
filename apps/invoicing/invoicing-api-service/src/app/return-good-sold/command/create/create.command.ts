import { UserCognito } from '@auth-guard-lib';
import { CreateReturnGoodSoldDto } from '@dto';

export class CreateReturnGoodSoldCommand {
    constructor(public readonly returnGoodSoldDto: CreateReturnGoodSoldDto, public readonly user: UserCognito) {}
}

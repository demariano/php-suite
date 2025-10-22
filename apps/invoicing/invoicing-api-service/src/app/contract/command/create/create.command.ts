import { UserCognito } from '@auth-guard-lib';
import { CreateContractDto } from '@dto';

export class CreateContractCommand {
    constructor(public readonly contractDto: CreateContractDto, public readonly user: UserCognito) {}
}

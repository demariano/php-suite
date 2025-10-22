import { UserCognito } from '@auth-guard-lib';
import { ContractDto } from '@dto';

export class DeleteContractCommand {
    constructor(
        public readonly id: string,
        public readonly contractDto: ContractDto,
        public readonly user: UserCognito
    ) {}
}

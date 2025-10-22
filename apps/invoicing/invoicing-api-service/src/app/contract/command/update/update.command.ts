import { UserCognito } from '@auth-guard-lib';
import { ContractDto } from '@dto';

export class UpdateContractCommand {
    constructor(
        public readonly id: string,
        public readonly contractDto: ContractDto,
        public readonly user: UserCognito
    ) {}
}

import { UserCognito } from '@auth-guard-lib';

export class RebateComputeContractCommand {
    constructor(public readonly contractId: string, public readonly user: UserCognito) {}
}



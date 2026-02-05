import { UserCognito } from '@auth-guard-lib';

export class ReactivateProductCommand {
    constructor(public readonly productId: string, public readonly user: UserCognito) {}
}

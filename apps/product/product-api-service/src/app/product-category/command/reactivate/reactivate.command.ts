import { UserCognito } from '@auth-guard-lib';

export class ReactivateProductCategoryCommand {
    constructor(public readonly productCategoryId: string, public readonly user: UserCognito) {}
}

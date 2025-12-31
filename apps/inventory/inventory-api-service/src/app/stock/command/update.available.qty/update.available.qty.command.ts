import { UserCognito } from '@auth-guard-lib';

export class UpdateAvailableQtyCommand {
    constructor(public readonly recordId: string, public readonly qty: number, public readonly user: UserCognito) {}
}

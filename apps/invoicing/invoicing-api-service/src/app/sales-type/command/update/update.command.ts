import { UserCognito } from '@auth-guard-lib';
import { SalesTypeDto } from '@dto';

export class UpdateSalesTypeCommand {
    constructor(
        public readonly salesTypeId: string,
        public readonly salesTypeDto: SalesTypeDto,
        public readonly user: UserCognito
    ) {}
}

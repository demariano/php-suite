import { CustomerTypeDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';

export class UpdateCustomerTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly customerTypeDto: CustomerTypeDto,
        public readonly user: UserCognito
    ) {}
}

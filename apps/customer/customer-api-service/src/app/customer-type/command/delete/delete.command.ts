import { CustomerTypeDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';

export class DeleteCustomerTypeCommand {
    constructor(
        public readonly recordId: string,
        public readonly customerTypeDto: CustomerTypeDto,
        public readonly user: UserCognito
    ) {}
}

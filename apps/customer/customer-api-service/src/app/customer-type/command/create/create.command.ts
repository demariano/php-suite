import { CreateCustomerTypeDto } from '@dto';
import { UserCognito } from '@auth-guard-lib';

export class CreateCustomerTypeCommand {
    constructor(
        public readonly customerTypeDto: CreateCustomerTypeDto,
        public readonly user: UserCognito
    ) {}
}

import { UserCognito } from '@auth-guard-lib';
import { CustomerDto } from '@dto';

export class UpdateCustomerCommand {
    customerId: string;
    customerDto: CustomerDto;
    user: UserCognito;

    constructor(customerId: string, customerDto: CustomerDto, user: UserCognito) {
        this.customerId = customerId;
        this.customerDto = customerDto;
        this.user = user;
    }
}

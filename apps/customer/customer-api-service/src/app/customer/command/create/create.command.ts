import { UserCognito } from '@auth-guard-lib';
import { CreateCustomerDto } from '@dto';

export class CreateCustomerCommand {
    customerDto: CreateCustomerDto;
    user: UserCognito;

    constructor(customerDto: CreateCustomerDto, user: UserCognito) {
        this.customerDto = customerDto;
        this.user = user;
    }
}

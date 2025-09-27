import { UserCognito } from '@auth-guard-lib';
import { CreateCustomerClassificationDto } from '@dto';

export class CreateCustomerClassificationCommand {
    customerClassificationDto: CreateCustomerClassificationDto;
    user: UserCognito;

    constructor(customerClassificationDto: CreateCustomerClassificationDto, user: UserCognito) {
        this.customerClassificationDto = customerClassificationDto;
        this.user = user;
    }
}

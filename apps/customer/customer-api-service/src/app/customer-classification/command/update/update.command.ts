import { UserCognito } from '@auth-guard-lib';
import { CustomerClassificationDto } from '@dto';

export class UpdateCustomerClassificationCommand {
    recordId: string;
    customerClassificationDto: CustomerClassificationDto;
    user: UserCognito;

    constructor(recordId: string, customerClassificationDto: CustomerClassificationDto, user: UserCognito) {
        this.recordId = recordId;
        this.customerClassificationDto = customerClassificationDto;
        this.user = user;
    }
}

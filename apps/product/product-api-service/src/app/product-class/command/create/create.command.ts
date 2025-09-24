import { UserCognito } from '@auth-guard-lib';
import { CreateProductClassDto } from '@dto';

export class CreateProductClassCommand {
    productClassDto: CreateProductClassDto;
    user: UserCognito;

    constructor(productClassDto: CreateProductClassDto, user: UserCognito) {
        this.productClassDto = productClassDto;
        this.user = user;
    }
}

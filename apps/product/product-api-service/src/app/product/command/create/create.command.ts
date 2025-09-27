import { UserCognito } from '@auth-guard-lib';
import { CreateProductDto } from '@dto';

export class CreateProductCommand {
    productDto: CreateProductDto;
    user: UserCognito;

    constructor(productDto: CreateProductDto, user: UserCognito) {
        this.productDto = productDto;
        this.user = user;
    }
}

import { UserCognito } from '@auth-guard-lib';
import { ProductClassDto } from '@dto';

export class UpdateProductClassCommand {
    productClassDto: ProductClassDto;
    productClassId: string;
    user: UserCognito;

    constructor(productClassId: string, productClassDto: ProductClassDto, user: UserCognito) {
        this.productClassDto = productClassDto;
        this.productClassId = productClassId;
        this.user = user;
    }
}

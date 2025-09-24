import { UserCognito } from '@auth-guard-lib';
import { CreateProductUnitDto } from '@dto';

export class CreateProductUnitCommand {
    productUnitDto: CreateProductUnitDto;
    user: UserCognito;

    constructor(productUnitDto: CreateProductUnitDto, user: UserCognito) {
        this.productUnitDto = productUnitDto;
        this.user = user;
    }
}

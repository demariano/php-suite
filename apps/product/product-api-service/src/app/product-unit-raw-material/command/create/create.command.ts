import { UserCognito } from '@auth-guard-lib';
import { CreateProductUnitRawMaterialDto } from '@dto';

export class CreateProductUnitRawMaterialCommand {
    productUnitRawMaterialDto: CreateProductUnitRawMaterialDto;
    user: UserCognito;

    constructor(productUnitRawMaterialDto: CreateProductUnitRawMaterialDto, user: UserCognito) {
        this.productUnitRawMaterialDto = productUnitRawMaterialDto;
        this.user = user;
    }
}

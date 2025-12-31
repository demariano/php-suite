import { UserCognito } from '@auth-guard-lib';
import { ProductUnitRawMaterialDto } from '@dto';

export class UpdateProductUnitRawMaterialCommand {
    productUnitRawMaterialDto: ProductUnitRawMaterialDto;
    productUnitRawMaterialId: string;
    user: UserCognito;

    constructor(
        productUnitRawMaterialId: string,
        productUnitRawMaterialDto: ProductUnitRawMaterialDto,
        user: UserCognito
    ) {
        this.productUnitRawMaterialDto = productUnitRawMaterialDto;
        this.productUnitRawMaterialId = productUnitRawMaterialId;
        this.user = user;
    }
}

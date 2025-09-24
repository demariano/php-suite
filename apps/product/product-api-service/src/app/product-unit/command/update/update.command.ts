import { UserCognito } from '@auth-guard-lib';
import { ProductUnitDto } from '@dto';

export class UpdateProductUnitCommand {
    productUnitDto: ProductUnitDto;
    productUnitId: string;
    user: UserCognito;

    constructor(productUnitId: string, productUnitDto: ProductUnitDto, user: UserCognito) {
        this.productUnitDto = productUnitDto;
        this.productUnitId = productUnitId;
        this.user = user;
    }
}

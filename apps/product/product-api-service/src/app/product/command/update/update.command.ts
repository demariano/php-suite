import { UserCognito } from '@auth-guard-lib';
import { ProductDto } from '@dto';

export class UpdateProductCommand {
    productDto: ProductDto;
    productId: string;
    user: UserCognito;

    constructor(productId: string, productDto: ProductDto, user: UserCognito) {
        this.productDto = productDto;
        this.productId = productId;
        this.user = user;
    }
}

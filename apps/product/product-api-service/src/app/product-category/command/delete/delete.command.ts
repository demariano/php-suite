import { UserCognito } from '@auth-guard-lib';
import { ProductCategoryDto } from '@dto';

export class DeleteProductCategoryCommand {
    productCategoryDto: ProductCategoryDto;
    productCategoryId: string;
    user: UserCognito;
    deletionReason?: string;

    constructor(productCategoryId: string, productCategoryDto: ProductCategoryDto, user: UserCognito, deletionReason?: string) {
        this.productCategoryDto = productCategoryDto;
        this.productCategoryId = productCategoryId;
        this.user = user;
        this.deletionReason = deletionReason;
    }
}

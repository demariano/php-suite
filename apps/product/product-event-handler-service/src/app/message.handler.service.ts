import {
    ProductCategoryEventDto,
    ProductCategoryEventEnum,
    ProductClassEventDto,
    ProductClassEventEnum,
    ProductEventDto,
    ProductEventEnum,
} from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { ProductCategorySyncHandlerService } from './product-category-sync-handler/product-category-sync.handler.service';
import { ProductClassSyncHandlerService } from './product-class-sync-handler/product-class-sync.handler.service';
import { ProductSyncHandlerService } from './product-sync-handler/product-sync.handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly productCategorySyncHandlerService: ProductCategorySyncHandlerService,
        private readonly productClassSyncHandlerService: ProductClassSyncHandlerService,
        private readonly productSyncHandlerService: ProductSyncHandlerService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        const messageBody = JSON.parse(message);

        // Check if this is a product category event
        if (messageBody.eventType && Object.values(ProductCategoryEventEnum).includes(messageBody.eventType)) {
            const productCategoryEvent = messageBody as ProductCategoryEventDto;
            this.logger.log(
                `Handling product category event: ${productCategoryEvent.eventType} for productCategoryId: ${productCategoryEvent.productCategoryId}`
            );

            await this.productCategorySyncHandlerService.handleProductCategoryUpdatedEvent({
                productCategoryId: productCategoryEvent.productCategoryId,
                newProductCategoryName: productCategoryEvent.newProductCategoryName,
            });
            return;
        }

        // Check if this is a product class event
        if (messageBody.eventType && Object.values(ProductClassEventEnum).includes(messageBody.eventType)) {
            const productClassEvent = messageBody as ProductClassEventDto;
            this.logger.log(
                `Handling product class event: ${productClassEvent.eventType} for productClassId: ${productClassEvent.productClassId}`
            );

            await this.productClassSyncHandlerService.handleProductClassUpdatedEvent({
                productClassId: productClassEvent.productClassId,
                newProductClassName: productClassEvent.newProductClassName,
            });
            return;
        }

        // Check if this is a product event
        if (messageBody.eventType && Object.values(ProductEventEnum).includes(messageBody.eventType)) {
            const productEvent = messageBody as ProductEventDto;
            this.logger.log(
                `Handling product event: ${productEvent.eventType} for productId: ${productEvent.productId}`
            );

            await this.productSyncHandlerService.handleProductUpdatedEvent({
                productId: productEvent.productId,
                newProductName: productEvent.newProductName,
            });
            return;
        }

        this.logger.warn(`Unhandled event type: ${messageBody.eventType}`);
    }
}

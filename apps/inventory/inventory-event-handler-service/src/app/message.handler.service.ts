import {
    InventoryEventDto,
    InventoryEventEnum,
    ProductEventDto,
    ProductEventEnum,
    ProductUnitEventDto,
    ProductUnitEventEnum,
    RawMaterialEventDto,
    RawMaterialEventEnum,
    RawMaterialSupplierEventDto,
    RawMaterialSupplierEventEnum,
    RawMaterialUnitEventDto,
    RawMaterialUnitEventEnum,
    RawMaterialsLocationEventDto,
    RawMaterialsLocationEventEnum,
    StockTypeEventDto,
    StockTypeEventEnum,
    SupplierEventDto,
    SupplierEventEnum,
} from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { ProductSyncHandlerService } from './product-sync-handler.service';
import { ProductUnitSyncHandlerService } from './product-unit-sync-handler.service';
import { RawMaterialSupplierSyncHandlerService } from './raw-material-supplier-sync-handler.service';
import { RawMaterialSyncHandlerService } from './raw-material-sync-handler.service';
import { RawMaterialUnitSyncHandlerService } from './raw-material-unit-sync-handler.service';
import { RawMaterialsAutoOrderService } from './raw-materials-auto-order/raw.materials.auto.order.service';
import { RawMaterialsLocationSyncHandlerService } from './raw-materials-location-sync-handler.service';
import { StockQtyHandlerService } from './stock-qty-handler/stock.qty.handler.service';
import { StockTypeSyncHandlerService } from './stock-type-sync-handler.service';
import { SupplierSyncHandlerService } from './supplier-sync-handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly stockQtyHandlerService: StockQtyHandlerService,
        private readonly stockTypeSyncHandlerService: StockTypeSyncHandlerService,
        private readonly rawMaterialSyncHandlerService: RawMaterialSyncHandlerService,
        private readonly rawMaterialUnitSyncHandlerService: RawMaterialUnitSyncHandlerService,
        private readonly rawMaterialSupplierSyncHandlerService: RawMaterialSupplierSyncHandlerService,
        private readonly rawMaterialsLocationSyncHandlerService: RawMaterialsLocationSyncHandlerService,
        private readonly supplierSyncHandlerService: SupplierSyncHandlerService,
        private readonly productSyncHandlerService: ProductSyncHandlerService,
        private readonly productUnitSyncHandlerService: ProductUnitSyncHandlerService,
        private readonly rawMaterialsAutoOrderService: RawMaterialsAutoOrderService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        let parsedMessage: any;

        try {
            parsedMessage = JSON.parse(message);
        } catch {
            this.logger.error('Failed to parse message');
            return;
        }

        // Check if it's a StockType event
        if (parsedMessage.eventType && Object.values(StockTypeEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as StockTypeEventDto;
            if (event.eventType === StockTypeEventEnum.STOCK_TYPE_UPDATED) {
                await this.stockTypeSyncHandlerService.handleStockTypeUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a RawMaterial event
        if (parsedMessage.eventType && Object.values(RawMaterialEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as RawMaterialEventDto;
            if (event.eventType === RawMaterialEventEnum.RAW_MATERIAL_UPDATED) {
                await this.rawMaterialSyncHandlerService.handleRawMaterialUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a RawMaterialUnit event
        if (parsedMessage.eventType && Object.values(RawMaterialUnitEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as RawMaterialUnitEventDto;
            if (event.eventType === RawMaterialUnitEventEnum.RAW_MATERIAL_UNIT_UPDATED) {
                await this.rawMaterialUnitSyncHandlerService.handleRawMaterialUnitUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a RawMaterialSupplier event
        if (parsedMessage.eventType && Object.values(RawMaterialSupplierEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as RawMaterialSupplierEventDto;
            if (event.eventType === RawMaterialSupplierEventEnum.RAW_MATERIAL_SUPPLIER_UPDATED) {
                await this.rawMaterialSupplierSyncHandlerService.handleRawMaterialSupplierUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a RawMaterialsLocation event
        if (parsedMessage.eventType && Object.values(RawMaterialsLocationEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as RawMaterialsLocationEventDto;
            if (event.eventType === RawMaterialsLocationEventEnum.RAW_MATERIALS_LOCATION_UPDATED) {
                await this.rawMaterialsLocationSyncHandlerService.handleRawMaterialsLocationUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a Supplier event
        if (parsedMessage.eventType && Object.values(SupplierEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as SupplierEventDto;
            if (event.eventType === SupplierEventEnum.SUPPLIER_UPDATED) {
                await this.supplierSyncHandlerService.handleSupplierUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a Product event (cross-domain)
        if (parsedMessage.eventType && Object.values(ProductEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as ProductEventDto;
            if (event.eventType === ProductEventEnum.PRODUCT_UPDATED) {
                await this.productSyncHandlerService.handleProductUpdatedEvent(event);
            }
            return;
        }

        // Check if it's a ProductUnit event (cross-domain)
        if (parsedMessage.eventType && Object.values(ProductUnitEventEnum).includes(parsedMessage.eventType)) {
            const event = parsedMessage as ProductUnitEventDto;
            if (event.eventType === ProductUnitEventEnum.PRODUCT_UNIT_UPDATED) {
                await this.productUnitSyncHandlerService.handleProductUnitUpdatedEvent(event);
            }
            return;
        }

        // Handle legacy inventory events
        const inventoryEvent = parsedMessage as InventoryEventDto;

        switch (inventoryEvent.inventoryEvent) {
            case InventoryEventEnum.STOCK_PURCHASE_ORDER_CREATED:
                this.logger.log('Handling stock purchase order creation event for auto-ordering raw materials');
                await this.rawMaterialsAutoOrderService.handle(inventoryEvent);
                break;
            case InventoryEventEnum.STOCK_QTY_UPDATE:
                // Handle single stock quantity update event
                if (inventoryEvent.stockId && inventoryEvent.qty !== undefined) {
                    this.logger.log(
                        `Handling stock quantity update for Stock ID: ${inventoryEvent.stockId} with Qty: ${inventoryEvent.qty}`
                    );
                    await this.stockQtyHandlerService.handle(inventoryEvent.stockId, inventoryEvent.qty);
                }
                break;

            case InventoryEventEnum.STOCK_ADJUSTMENT:
                // Handle atomic stock adjustment: restore first, then deduct (guaranteed order within single message)
                this.logger.log('Handling stock adjustment event');

                // Step 1: Restore stock items (add back to stock)
                if (inventoryEvent.stockItemsToRestore && inventoryEvent.stockItemsToRestore.length > 0) {
                    this.logger.log(`Restoring ${inventoryEvent.stockItemsToRestore.length} stock items`);
                    for (const item of inventoryEvent.stockItemsToRestore) {
                        if (item.stockId && item.qty !== undefined) {
                            this.logger.log(
                                `Processing stock restoration - Stock ID: ${item.stockId}, Qty: ${item.qty}`
                            );
                            await this.stockQtyHandlerService.handle(item.stockId, item.qty, true);
                        }
                    }
                }

                // Step 2: Deduct stock items (subtract from stock)
                if (inventoryEvent.stockItemsToDeduct && inventoryEvent.stockItemsToDeduct.length > 0) {
                    this.logger.log(`Deducting ${inventoryEvent.stockItemsToDeduct.length} stock items`);
                    for (const item of inventoryEvent.stockItemsToDeduct) {
                        if (item.stockId && item.qty !== undefined) {
                            this.logger.log(`Processing stock deduction - Stock ID: ${item.stockId}, Qty: ${item.qty}`);
                            await this.stockQtyHandlerService.handle(item.stockId, item.qty, false);
                        }
                    }
                }

                this.logger.log('Completed processing stock adjustment event');
                break;

            default:
                this.logger.warn(`Unhandled inventory event type: ${inventoryEvent.inventoryEvent}`);
        }
    }
}

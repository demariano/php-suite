import { InventoryEventDto, InventoryEventEnum } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { StockQtyHandlerService } from './stock-qty-handler/stock.qty.handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(private readonly stockQtyHandlerService: StockQtyHandlerService) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        const inventoryEvent = JSON.parse(message) as InventoryEventDto;

        switch (inventoryEvent.inventoryEvent) {
            case InventoryEventEnum.STOCK_QTY_UPDATE:
                // Handle single stock quantity update event
                if (inventoryEvent.stockId && inventoryEvent.qty !== undefined) {
                    this.logger.log(
                        `Handling stock quantity update for Stock ID: ${inventoryEvent.stockId} with Qty: ${inventoryEvent.qty}`
                    );
                    await this.stockQtyHandlerService.handle(inventoryEvent.stockId, inventoryEvent.qty);
                }
                break;

            case InventoryEventEnum.INVOICE_APPROVED:
                // Handle batch stock quantity updates from invoice approval (deduct quantities)
                if (inventoryEvent.stockItems && inventoryEvent.stockItems.length > 0) {
                    this.logger.log(
                        `Handling invoice approval with ${inventoryEvent.stockItems.length} stock items to update`
                    );

                    for (const item of inventoryEvent.stockItems) {
                        if (item.stockId && item.qty !== undefined) {
                            this.logger.log(`Processing stock deduction - Stock ID: ${item.stockId}, Qty: ${item.qty}`);
                            await this.stockQtyHandlerService.handle(item.stockId, item.qty, false);
                        }
                    }

                    this.logger.log('Completed processing all stock deductions for invoice approval');
                }
                break;

            case InventoryEventEnum.INVOICE_DELETED:
                // Handle batch stock quantity updates from invoice deletion (restore quantities)
                if (inventoryEvent.stockItems && inventoryEvent.stockItems.length > 0) {
                    this.logger.log(
                        `Handling invoice deletion with ${inventoryEvent.stockItems.length} stock items to restore`
                    );

                    for (const item of inventoryEvent.stockItems) {
                        if (item.stockId && item.qty !== undefined) {
                            this.logger.log(
                                `Processing stock restoration - Stock ID: ${item.stockId}, Qty: ${item.qty}`
                            );
                            await this.stockQtyHandlerService.handle(item.stockId, item.qty, true);
                        }
                    }

                    this.logger.log('Completed processing all stock restorations for invoice deletion');
                }
                break;

            default:
                this.logger.warn(`Unhandled inventory event type: ${inventoryEvent.inventoryEvent}`);
        }
    }
}

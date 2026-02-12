import { InventoryEventDto, InventoryEventEnum } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Represents an invoice detail line item with at least stockId and qty fields.
 * Uses a minimal structural interface to remain compatible with various DTO shapes
 * (InvoiceDetailsDto, ReturnGoodSold details, etc.)
 */
interface InvoiceDetailItem {
    stockId?: string;
    qty?: number;
}

@Injectable()
export class InvoiceStockDeltaService {
    private readonly logger = new Logger(InvoiceStockDeltaService.name);

    constructor(
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    /**
     * Computes the stock delta between old and new invoice details, then sends a single
     * STOCK_ADJUSTMENT event containing both restore and deduct arrays.
     * The consumer processes restores first, then deductions — guaranteed order in one SQS message.
     *
     * @param oldDetails - The invoice details currently applied (before the change)
     * @param newDetails - The invoice details to be applied (after the change)
     * @param contextId - An identifier for logging (e.g., invoiceId, rgsId)
     */
    async applyStockDeltas(
        oldDetails: InvoiceDetailItem[],
        newDetails: InvoiceDetailItem[],
        contextId: string
    ): Promise<void> {
        const oldStockMap = this.buildStockMap(oldDetails);
        const newStockMap = this.buildStockMap(newDetails);

        const itemsToDeduct: { stockId: string; qty: number }[] = [];
        const itemsToRestore: { stockId: string; qty: number }[] = [];

        // Check all stock items in new details
        for (const [stockId, newQty] of newStockMap.entries()) {
            const oldQty = oldStockMap.get(stockId) || 0;
            const delta = newQty - oldQty;

            if (delta > 0) {
                // Quantity increased — deduct more from stock
                itemsToDeduct.push({ stockId, qty: delta });
            } else if (delta < 0) {
                // Quantity decreased — restore some to stock
                itemsToRestore.push({ stockId, qty: Math.abs(delta) });
            }
            // If delta === 0, no change needed
        }

        // Check for items that were completely removed
        for (const [stockId, oldQty] of oldStockMap.entries()) {
            if (!newStockMap.has(stockId)) {
                // Item removed — restore all to stock
                itemsToRestore.push({ stockId, qty: oldQty });
            }
        }

        if (itemsToDeduct.length === 0 && itemsToRestore.length === 0) {
            this.logger.log(`No stock adjustments needed for: ${contextId}`);
            return;
        }

        // Send a single atomic STOCK_ADJUSTMENT event with both arrays
        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.STOCK_ADJUSTMENT,
            stockItemsToRestore: itemsToRestore.length > 0 ? itemsToRestore : undefined,
            stockItemsToDeduct: itemsToDeduct.length > 0 ? itemsToDeduct : undefined,
        };

        await this.sendInventoryEventMessage(inventoryEvent);

        this.logger.log(
            `STOCK_ADJUSTMENT event sent for ${contextId} — ` +
                `restore: ${itemsToRestore.length} items, deduct: ${itemsToDeduct.length} items`
        );
    }

    /**
     * Sends STOCK_ADJUSTMENT event to deduct stock quantities (full deduction for first-time activation)
     */
    async sendFullDeduction(details: InvoiceDetailItem[], contextId: string): Promise<void> {
        const stockItems = this.extractStockItems(details);
        if (stockItems.length === 0) {
            return;
        }

        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.STOCK_ADJUSTMENT,
            stockItemsToDeduct: stockItems,
        };

        await this.sendInventoryEventMessage(inventoryEvent);
        this.logger.log(`STOCK_ADJUSTMENT (deduction) event sent for: ${contextId}`);
    }

    /**
     * Sends STOCK_ADJUSTMENT event to restore stock quantities (full restoration for deletion)
     */
    async sendFullRestoration(details: InvoiceDetailItem[], contextId: string): Promise<void> {
        const stockItems = this.extractStockItems(details);
        if (stockItems.length === 0) {
            return;
        }

        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.STOCK_ADJUSTMENT,
            stockItemsToRestore: stockItems,
        };

        await this.sendInventoryEventMessage(inventoryEvent);
        this.logger.log(`STOCK_ADJUSTMENT (restoration) event sent for: ${contextId}`);
    }

    /**
     * Builds a map of stockId to total quantity from invoice details.
     * Handles cases where same stockId appears multiple times.
     */
    private buildStockMap(details: InvoiceDetailItem[]): Map<string, number> {
        const stockMap = new Map<string, number>();

        for (const detail of details || []) {
            if (detail.stockId && detail.qty !== undefined) {
                const currentQty = stockMap.get(detail.stockId) || 0;
                stockMap.set(detail.stockId, currentQty + detail.qty);
            }
        }

        return stockMap;
    }

    /**
     * Extracts stockId/qty pairs from invoice details, filtering out items without stockId
     */
    private extractStockItems(details: InvoiceDetailItem[]): { stockId: string; qty: number }[] {
        return (details || [])
            .filter(
                (detail): detail is InvoiceDetailItem & { stockId: string; qty: number } =>
                    !!detail.stockId && detail.qty !== undefined
            )
            .map((detail) => ({
                stockId: detail.stockId,
                qty: detail.qty,
            }));
    }

    /**
     * Sends inventory event to INVENTORY_EVENT_SQS
     */
    private async sendInventoryEventMessage(inventoryEvent: InventoryEventDto): Promise<void> {
        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
    }
}

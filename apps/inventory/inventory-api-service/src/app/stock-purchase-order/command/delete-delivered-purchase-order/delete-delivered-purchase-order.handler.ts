import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    StockDto,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract, StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteDeliveredPurchaseOrderCommand } from './delete-delivered-purchase-order.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteDeliveredPurchaseOrderCommand)
export class DeleteDeliveredPurchaseOrderHandler implements ICommandHandler<DeleteDeliveredPurchaseOrderCommand> {
    protected readonly logger = new Logger(DeleteDeliveredPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract,
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteDeliveredPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.stockPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Stock purchase order not found for ID: ${command.recordId}`);
        }

        // Check if PO status is ACTIVE
        if (existing.status !== StatusEnum.ACTIVE) {
            throw new BadRequestException(
                `Cannot delete deliveries for purchase order with status: ${existing.status}. Only ACTIVE purchase orders can have deliveries modified.`
            );
        }

        const deletions = command.stockPurchaseOrderDto.deliveredPurchaseOrderDetails || [];
        if (!deletions.length) {
            throw new BadRequestException('No deliveredPurchaseOrderDetails supplied to delete');
        }

        for (const delivery of deletions) {
            await this.removeDelivery(existing, delivery, command.user);
        }

        this.updatePoStatus(existing);
        this.appendActivity(existing, command.user, deletions);

        try {
            const updated = await this.stockPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<StockPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete delivered purchase order details', error as Error);
            throw new BadRequestException('Failed to delete delivered purchase order details');
        }
    }

    private async removeDelivery(
        po: StockPurchaseOrderDto,
        delivery: StockPurchaseOrderDto['deliveredPurchaseOrderDetails'][number],
        user: UserCognito
    ): Promise<void> {
        po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails || [];
        const target = po.deliveredPurchaseOrderDetails.find((d) => d.deliveryDate === delivery.deliveryDate);
        if (!target) {
            return;
        }

        for (const line of delivery.stockItems || []) {
            if (!target.stockItems) {
                continue;
            }

            const idx = target.stockItems.findIndex(
                (rm) =>
                    (rm.productId || rm.productName || '') === (line.productId || line.productName || '') &&
                    (rm.lotNo || '') === (line.lotNo || '')
            );

            if (idx < 0) {
                continue;
            }

            const currentQty = target.stockItems[idx].deliveredQty || 0;
            const requestedQty = line.deliveredQty || 0;
            const removalQty = Math.min(currentQty, requestedQty);

            if (removalQty <= 0) {
                continue;
            }

            await this.deductFromStock(line, po, user, delivery.deliveryDate, removalQty);

            const remainingQty = currentQty - removalQty;
            if (remainingQty > 0) {
                target.stockItems[idx].deliveredQty = remainingQty;
            } else {
                target.stockItems.splice(idx, 1);
            }
        }

        if ((target.stockItems || []).length === 0) {
            po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails.filter(
                (d) => d.deliveryDate !== delivery.deliveryDate
            );
        }
    }

    private async deductFromStock(
        line: StockDto,
        po: StockPurchaseOrderDto,
        user: UserCognito,
        deliveryDate: string | undefined,
        qtyDelta: number
    ): Promise<void> {
        const lotNo = line.lotNo || '';
        const productId = line.productId || '';
        const stockRecords = await this.stockDatabaseService.findAllRecordsByProductAndLot(productId, lotNo);

        if (!stockRecords || stockRecords.length === 0) {
            // If no stock record exists, just skip the deduction (delivery will still be deleted)
            this.logger.warn(
                `No stock record found for product ${productId} lot ${
                    lotNo || 'N/A'
                } when deleting delivery. Skipping stock deduction.`
            );
            return;
        }

        for (const existingStock of stockRecords) {
            existingStock.quantityOnHand = Math.max(0, (existingStock.quantityOnHand || 0) - qtyDelta);
            existingStock.availableQuantity = Math.max(0, (existingStock.availableQuantity || 0) - qtyDelta);
            existingStock.activityLogs = existingStock.activityLogs || [];
            existingStock.activityLogs.push(
                `Date: ${deliveryDate || 'N/A'}, Deducted ${qtyDelta} from PO ${
                    po.docNo || po.stockPurchaseOrderId
                } by ${user.username}`
            );
            existingStock.activityLogs = reduceArrayContents(existingStock.activityLogs, ACTIVITY_LOGS_LIMIT);
            await this.stockDatabaseService.updateRecord(existingStock);
        }
    }

    private updatePoStatus(po: StockPurchaseOrderDto): void {
        const requiredMap = new Map<string, number>();
        for (const detail of po.purchaseOrderDetails || []) {
            const key = detail.productId || detail.productName || '';
            requiredMap.set(key, (requiredMap.get(key) || 0) + (detail.qty || 0));
        }

        const deliveredMap = new Map<string, number>();
        for (const delivery of po.deliveredPurchaseOrderDetails || []) {
            for (const rm of delivery.stockItems || []) {
                const key = rm.productId || rm.productName || '';
                deliveredMap.set(key, (deliveredMap.get(key) || 0) + (rm.deliveredQty || 0));
            }
        }

        const isCompleted = Array.from(requiredMap.entries()).every(
            ([key, qty]) => (deliveredMap.get(key) || 0) >= qty
        );
        po.poStatus = isCompleted ? StockPurchaseOrderStatusEnum.COMPLETED : StockPurchaseOrderStatusEnum.PARTIAL;
    }

    private appendActivity(
        po: StockPurchaseOrderDto,
        user: UserCognito,
        deletions: NonNullable<StockPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        po.activityLogs = po.activityLogs || [];
        po.activityLogs.push(
            `Date: ${timestamp}, Removed delivered items (${deletions.length} batch/es) by ${user.username}, PO status: ${po.poStatus}`
        );
        po.activityLogs = reduceArrayContents(po.activityLogs, ACTIVITY_LOGS_LIMIT);
    }
}

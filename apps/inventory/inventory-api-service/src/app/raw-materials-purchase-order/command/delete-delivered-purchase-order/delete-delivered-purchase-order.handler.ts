import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
    RawMaterialsStockDto,
    ResponseDto,
    StatusEnum,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    RawMaterialsPurchaseOrderDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
} from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteDeliveredPurchaseOrderCommand } from './delete-delivered-purchase-order.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteDeliveredPurchaseOrderCommand)
export class DeleteDeliveredPurchaseOrderHandler implements ICommandHandler<DeleteDeliveredPurchaseOrderCommand> {
    protected readonly logger = new Logger(DeleteDeliveredPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract,
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteDeliveredPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${command.recordId}`);
        }

        // Check if PO status is ACTIVE
        if (existing.status !== StatusEnum.ACTIVE) {
            throw new BadRequestException(
                `Cannot delete deliveries for purchase order with status: ${existing.status}. Only ACTIVE purchase orders can have deliveries modified.`
            );
        }

        const deletions = command.rawMaterialsPurchaseOrderDto.deliveredPurchaseOrderDetails || [];
        if (!deletions.length) {
            throw new BadRequestException('No deliveredPurchaseOrderDetails supplied to delete');
        }

        for (const delivery of deletions) {
            await this.removeDelivery(existing, delivery, command.user);
        }

        this.updatePoStatus(existing);
        this.appendActivity(existing, command.user, deletions);

        try {
            const updated = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete delivered purchase order details', error as Error);
            throw new BadRequestException('Failed to delete delivered purchase order details');
        }
    }

    private async removeDelivery(
        po: RawMaterialsPurchaseOrderDto,
        delivery: RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails'][number],
        user: UserCognito
    ): Promise<void> {
        po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails || [];
        const target = po.deliveredPurchaseOrderDetails.find((d) => d.deliveryDate === delivery.deliveryDate);
        if (!target) {
            return;
        }

        for (const line of delivery.rawMaterials || []) {
            if (!target.rawMaterials) {
                continue;
            }

            const idx = target.rawMaterials.findIndex(
                (rm) =>
                    (rm.rawMaterialId || rm.rawMaterialName || '') ===
                        (line.rawMaterialId || line.rawMaterialName || '') && (rm.lotNo || '') === (line.lotNo || '')
            );

            if (idx < 0) {
                continue;
            }

            const currentQty = target.rawMaterials[idx].deliveredQty || 0;
            const requestedQty = line.deliveredQty || 0;
            const removalQty = Math.min(currentQty, requestedQty);

            if (removalQty <= 0) {
                continue;
            }

            await this.deductFromStock(line, po, user, delivery.deliveryDate, removalQty);

            const remainingQty = currentQty - removalQty;
            if (remainingQty > 0) {
                target.rawMaterials[idx].deliveredQty = remainingQty;
            } else {
                target.rawMaterials.splice(idx, 1);
            }
        }

        if ((target.rawMaterials || []).length === 0) {
            po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails.filter(
                (d) => d.deliveryDate !== delivery.deliveryDate
            );
        }
    }

    private async deductFromStock(
        line: RawMaterialsStockDto,
        po: RawMaterialsPurchaseOrderDto,
        user: UserCognito,
        deliveryDate: string | undefined,
        qtyDelta: number
    ): Promise<void> {
        const lotNo = line.lotNo || '';
        const name = line.rawMaterialName || '';
        const existingStock = await this.rawMaterialsStockDatabaseService.findRecordByNameAndLotNo(name, lotNo);

        if (!existingStock) {
            throw new BadRequestException(
                `Cannot deduct stock for ${name} lot ${lotNo || 'N/A'} because no matching stock record was found`
            );
        }

        existingStock.qty = Math.max(0, (existingStock.qty || 0) - qtyDelta);
        existingStock.activityLogs = existingStock.activityLogs || [];
        existingStock.activityLogs.push(
            `Date: ${deliveryDate || 'N/A'}, Deducted ${qtyDelta} from PO ${po.rawMaterialsPurchaseOrderId} by ${
                user.username
            }`
        );
        existingStock.activityLogs = reduceArrayContents(existingStock.activityLogs, ACTIVITY_LOGS_LIMIT);
        await this.rawMaterialsStockDatabaseService.updateRecord(existingStock);
    }

    private updatePoStatus(po: RawMaterialsPurchaseOrderDto): void {
        const requiredMap = new Map<string, number>();
        for (const detail of po.purchaseOrderDetails || []) {
            const key = detail.rawMaterialId || detail.rawMaterialName || '';
            requiredMap.set(key, (requiredMap.get(key) || 0) + (detail.qty || 0));
        }

        const deliveredMap = new Map<string, number>();
        for (const delivery of po.deliveredPurchaseOrderDetails || []) {
            for (const rm of delivery.rawMaterials || []) {
                const key = rm.rawMaterialId || rm.rawMaterialName || '';
                deliveredMap.set(key, (deliveredMap.get(key) || 0) + (rm.deliveredQty || 0));
            }
        }

        const isCompleted = Array.from(requiredMap.entries()).every(
            ([key, qty]) => (deliveredMap.get(key) || 0) >= qty
        );
        po.poStatus = isCompleted
            ? RawMaterialsPurchaseOrderStatusEnum.COMPLETED
            : RawMaterialsPurchaseOrderStatusEnum.PARTIAL;
    }

    private appendActivity(
        po: RawMaterialsPurchaseOrderDto,
        user: UserCognito,
        deletions: NonNullable<RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        po.activityLogs = po.activityLogs || [];
        po.activityLogs.push(
            `Date: ${timestamp}, Removed delivered items (${deletions.length} batch/es) by ${user.username}, PO status: ${po.poStatus}`
        );
        po.activityLogs = reduceArrayContents(po.activityLogs, ACTIVITY_LOGS_LIMIT);
    }
}

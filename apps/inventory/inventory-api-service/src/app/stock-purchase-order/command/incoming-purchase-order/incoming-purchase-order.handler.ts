import { UserCognito } from '@auth-guard-lib';
import {
    CreateStockDto,
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
import { IncomingPurchaseOrderCommand } from './incoming-purchase-order.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(IncomingPurchaseOrderCommand)
export class IncomingPurchaseOrderHandler implements ICommandHandler<IncomingPurchaseOrderCommand> {
    protected readonly logger = new Logger(IncomingPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract,
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(
        command: IncomingPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.stockPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Stock purchase order not found for ID: ${command.recordId}`);
        }

        // Check if PO status is ACTIVE
        if (existing.status !== StatusEnum.ACTIVE) {
            throw new BadRequestException(
                `Cannot record deliveries for purchase order with status: ${existing.status}. Only ACTIVE purchase orders can receive deliveries.`
            );
        }

        if (existing.poStatus === StockPurchaseOrderStatusEnum.COMPLETED) {
            throw new BadRequestException('Purchase order is already COMPLETED and cannot accept more deliveries');
        }

        const incomingDeliveries = command.stockPurchaseOrderDto.deliveredPurchaseOrderDetails || [];
        if (!incomingDeliveries.length) {
            throw new BadRequestException('No deliveredPurchaseOrderDetails supplied');
        }

        // Validate deliveryNo is provided for all deliveries
        for (const delivery of incomingDeliveries) {
            if (!delivery.deliveryNo || !delivery.deliveryNo.trim()) {
                throw new BadRequestException('Delivery No is required for all deliveries');
            }
        }

        // Validate deliveryNo + deliveryDate uniqueness within the PO
        const existingDeliveries = existing.deliveredPurchaseOrderDetails || [];
        for (const delivery of incomingDeliveries) {
            const duplicate = existingDeliveries.find(
                (d) => d.deliveryNo === delivery.deliveryNo && d.deliveryDate === delivery.deliveryDate
            );
            if (duplicate) {
                throw new BadRequestException(
                    `Delivery No '${delivery.deliveryNo}' on ${delivery.deliveryDate} already exists on this purchase order`
                );
            }
        }

        // Validate delivered quantities do not exceed ordered quantities
        this.validateDeliveryQuantities(existing, incomingDeliveries);

        for (const delivery of incomingDeliveries) {
            const deliveryDate = delivery.deliveryDate;
            for (const line of delivery.stockItems || []) {
                await this.addToStock(line, existing, command.user, deliveryDate, delivery);
            }
            this.mergeDelivery(existing, delivery);
        }

        this.updatePoStatus(existing);
        this.appendActivity(existing, command.user, incomingDeliveries);

        try {
            const updated = await this.stockPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<StockPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to apply incoming stock purchase order delivery', error as Error);
            throw new BadRequestException('Failed to apply incoming stock purchase order delivery');
        }
    }

    private validateDeliveryQuantities(
        existing: StockPurchaseOrderDto,
        incomingDeliveries: NonNullable<StockPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        // Calculate total ordered quantities
        const orderedMap = new Map<string, number>();
        for (const detail of existing.purchaseOrderDetails || []) {
            const key = detail.productId || detail.productName || '';
            orderedMap.set(key, (orderedMap.get(key) || 0) + (detail.qty || 0));
        }

        // Calculate already delivered quantities
        const deliveredMap = new Map<string, number>();
        for (const delivery of existing.deliveredPurchaseOrderDetails || []) {
            for (const rm of delivery.stockItems || []) {
                const key = rm.productId || rm.productName || '';
                deliveredMap.set(key, (deliveredMap.get(key) || 0) + (rm.deliveredQty || 0));
            }
        }

        // Calculate new delivery quantities and validate
        for (const delivery of incomingDeliveries) {
            for (const rm of delivery.stockItems || []) {
                const key = rm.productId || rm.productName || '';
                const newDeliveryQty = rm.deliveredQty || 0;
                const alreadyDelivered = deliveredMap.get(key) || 0;
                const ordered = orderedMap.get(key) || 0;
                const totalAfterDelivery = alreadyDelivered + newDeliveryQty;

                if (totalAfterDelivery > ordered) {
                    throw new BadRequestException(
                        `Delivery quantity for ${rm.productName || key} exceeds ordered quantity. ` +
                            `Ordered: ${ordered}, Already Delivered: ${alreadyDelivered}, New Delivery: ${newDeliveryQty}`
                    );
                }
            }
        }
    }

    private async addToStock(
        line: StockDto,
        po: StockPurchaseOrderDto,
        user: UserCognito,
        deliveryDate?: string,
        delivery?: StockPurchaseOrderDto['deliveredPurchaseOrderDetails'][number]
    ): Promise<void> {
        const lotNo = line.lotNo || '';
        const productId = line.productId || '';
        const qtyDelta = line['deliveredQty'] ?? 0;
        const stockRecords = await this.stockDatabaseService.findAllRecordsByProductAndLot(productId, lotNo);

        if (stockRecords && stockRecords.length > 0) {
            for (const stockRecord of stockRecords) {
                stockRecord.totalQuantity = (stockRecord.totalQuantity || 0) + qtyDelta;
                stockRecord.activityLogs = stockRecord.activityLogs || [];
                stockRecord.activityLogs.push(
                    `Date: ${deliveryDate || 'N/A'}, Added ${qtyDelta} from PO ${
                        po.docNo || po.stockPurchaseOrderId
                    } (Delivery No: ${delivery?.deliveryNo || 'N/A'}) by ${user.username}`
                );
                stockRecord.activityLogs = reduceArrayContents(stockRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

                // Update stockTypeId and stockTypeName if provided in the delivery
                if (line.stockTypeId) {
                    stockRecord.stockTypeId = line.stockTypeId;
                }
                if (line.stockTypeName) {
                    stockRecord.stockTypeName = line.stockTypeName;
                }

                await this.stockDatabaseService.updateRecord(stockRecord);
            }
        } else {
            const createDto: CreateStockDto = {
                status: StatusEnum.ACTIVE,
                productId: line.productId,
                productName: line.productName,
                totalQuantity: qtyDelta,
                productUnitId: line.productUnitId,
                productUnitName: line.productUnitName,
                stockTypeId: line.stockTypeId,
                stockTypeName: line.stockTypeName,
                lotNo: lotNo || undefined,
                activityLogs: [
                    `Date: ${deliveryDate || 'N/A'}, Created from PO ${
                        po.docNo || po.stockPurchaseOrderId
                    } (Delivery No: ${delivery?.deliveryNo || 'N/A'}) by ${user.username}`,
                ],
                forApprovalVersion: undefined,
                changeReason: undefined,
                approverMessage: undefined,
            };
            await this.stockDatabaseService.createRecord(createDto);
        }
    }

    private mergeDelivery(
        po: StockPurchaseOrderDto,
        delivery: StockPurchaseOrderDto['deliveredPurchaseOrderDetails'][number]
    ): void {
        po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails || [];
        const existing = po.deliveredPurchaseOrderDetails.find(
            (d) => d.deliveryDate === delivery.deliveryDate && d.deliveryNo === delivery.deliveryNo
        );
        if (existing) {
            existing.stockItems = [...(existing.stockItems || []), ...(delivery.stockItems || [])];
        } else {
            po.deliveredPurchaseOrderDetails.push(delivery);
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
        deliveries: NonNullable<StockPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        po.activityLogs = po.activityLogs || [];
        po.activityLogs.push(
            `Date: ${timestamp}, Incoming delivery recorded (${deliveries.length} batch/es) by ${user.username}, PO status: ${po.poStatus}`
        );
        po.activityLogs = reduceArrayContents(po.activityLogs, ACTIVITY_LOGS_LIMIT);
    }
}

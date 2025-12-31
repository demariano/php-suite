import { UserCognito } from '@auth-guard-lib';
import {
    CreateRawMaterialsStockDto,
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
import { IncomingPurchaseOrderCommand } from './incoming-purchase-order.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(IncomingPurchaseOrderCommand)
export class IncomingPurchaseOrderHandler implements ICommandHandler<IncomingPurchaseOrderCommand> {
    protected readonly logger = new Logger(IncomingPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract,
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: IncomingPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${command.recordId}`);
        }

        // Check if PO status is ACTIVE
        if (existing.status !== StatusEnum.ACTIVE) {
            throw new BadRequestException(
                `Cannot record deliveries for purchase order with status: ${existing.status}. Only ACTIVE purchase orders can receive deliveries.`
            );
        }

        if (existing.poStatus === RawMaterialsPurchaseOrderStatusEnum.COMPLETED) {
            throw new BadRequestException('Purchase order is already COMPLETED and cannot accept more deliveries');
        }

        const incomingDeliveries = command.rawMaterialsPurchaseOrderDto.deliveredPurchaseOrderDetails || [];
        if (!incomingDeliveries.length) {
            throw new BadRequestException('No deliveredPurchaseOrderDetails supplied');
        }

        // Validate delivered quantities do not exceed ordered quantities
        this.validateDeliveryQuantities(existing, incomingDeliveries);

        for (const delivery of incomingDeliveries) {
            const deliveryDate = delivery.deliveryDate;
            for (const line of delivery.rawMaterials || []) {
                await this.addToStock(line, existing, command.user, deliveryDate, delivery);
            }
            this.mergeDelivery(existing, delivery);
        }

        this.updatePoStatus(existing);
        this.appendActivity(existing, command.user, incomingDeliveries);

        try {
            const updated = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to apply incoming raw materials purchase order delivery', error as Error);
            throw new BadRequestException('Failed to apply incoming raw materials purchase order delivery');
        }
    }

    private validateDeliveryQuantities(
        existing: RawMaterialsPurchaseOrderDto,
        incomingDeliveries: NonNullable<RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        // Calculate total ordered quantities
        const orderedMap = new Map<string, number>();
        for (const detail of existing.purchaseOrderDetails || []) {
            const key = detail.rawMaterialId || detail.rawMaterialName || '';
            orderedMap.set(key, (orderedMap.get(key) || 0) + (detail.qty || 0));
        }

        // Calculate already delivered quantities
        const deliveredMap = new Map<string, number>();
        for (const delivery of existing.deliveredPurchaseOrderDetails || []) {
            for (const rm of delivery.rawMaterials || []) {
                const key = rm.rawMaterialId || rm.rawMaterialName || '';
                deliveredMap.set(key, (deliveredMap.get(key) || 0) + (rm.deliveredQty || 0));
            }
        }

        // Calculate new delivery quantities and validate
        for (const delivery of incomingDeliveries) {
            for (const rm of delivery.rawMaterials || []) {
                const key = rm.rawMaterialId || rm.rawMaterialName || '';
                const newDeliveryQty = rm.deliveredQty || 0;
                const alreadyDelivered = deliveredMap.get(key) || 0;
                const ordered = orderedMap.get(key) || 0;
                const totalAfterDelivery = alreadyDelivered + newDeliveryQty;

                if (totalAfterDelivery > ordered) {
                    throw new BadRequestException(
                        `Delivery quantity for ${rm.rawMaterialName || key} exceeds ordered quantity. ` +
                            `Ordered: ${ordered}, Already Delivered: ${alreadyDelivered}, New Delivery: ${newDeliveryQty}`
                    );
                }
            }
        }
    }

    private async addToStock(
        line: RawMaterialsStockDto,
        po: RawMaterialsPurchaseOrderDto,
        user: UserCognito,
        deliveryDate?: string,
        delivery?: RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails'][number]
    ): Promise<void> {
        const lotNo = line.lotNo || '';
        const name = line.rawMaterialName || '';
        const qtyDelta = line.qty ?? line['deliveredQty'] ?? 0;
        const existingStock = await this.rawMaterialsStockDatabaseService.findRecordByNameAndLotNo(name, lotNo);

        if (existingStock) {
            existingStock.qty = (existingStock.qty || 0) + qtyDelta;
            existingStock.activityLogs = existingStock.activityLogs || [];
            existingStock.activityLogs.push(
                `Date: ${deliveryDate || 'N/A'}, Added ${qtyDelta} from PO ${
                    po.docNo || po.rawMaterialsPurchaseOrderId
                } by ${user.username}`
            );
            existingStock.activityLogs = reduceArrayContents(existingStock.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Update location if provided in delivery
            if (delivery?.rawMaterialsLocationId) {
                existingStock.rawMaterialsLocationId = delivery.rawMaterialsLocationId;
                existingStock.rawMaterialsLocationName = delivery.rawMaterialsLocationName;
            }

            await this.rawMaterialsStockDatabaseService.updateRecord(existingStock);
        } else {
            const createDto: CreateRawMaterialsStockDto = {
                status: StatusEnum.ACTIVE,
                rawMaterialId: line.rawMaterialId,
                rawMaterialName: name,
                rawMaterialUnitId: line.rawMaterialUnitId,
                rawMaterialUnitName: line.rawMaterialUnitName,
                rawMaterialSupplierId: po.rawMaterialSupplierId,
                rawMaterialSupplierName: po.rawMaterialSupplierName,
                rawMaterialsLocationId: delivery?.rawMaterialsLocationId,
                rawMaterialsLocationName: delivery?.rawMaterialsLocationName,
                rawMaterialNamePoNo: po.docNo || po.rawMaterialsPurchaseOrderId,
                qty: qtyDelta,
                lotNo: lotNo || undefined,
                activityLogs: [
                    `Date: ${deliveryDate || 'N/A'}, Created from PO ${po.docNo || po.rawMaterialsPurchaseOrderId} by ${
                        user.username
                    }`,
                ],
                forApprovalVersion: undefined,
                changeReason: undefined,
                approverMessage: undefined,
            };
            await this.rawMaterialsStockDatabaseService.createRecord(createDto);
        }
    }

    private mergeDelivery(
        po: RawMaterialsPurchaseOrderDto,
        delivery: RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails'][number]
    ): void {
        po.deliveredPurchaseOrderDetails = po.deliveredPurchaseOrderDetails || [];
        const existing = po.deliveredPurchaseOrderDetails.find((d) => d.deliveryDate === delivery.deliveryDate);
        if (existing) {
            existing.rawMaterials = [...(existing.rawMaterials || []), ...(delivery.rawMaterials || [])];
        } else {
            po.deliveredPurchaseOrderDetails.push(delivery);
        }
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
        deliveries: NonNullable<RawMaterialsPurchaseOrderDto['deliveredPurchaseOrderDetails']>
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        po.activityLogs = po.activityLogs || [];
        po.activityLogs.push(
            `Date: ${timestamp}, Incoming delivery recorded (${deliveries.length} batch/es) by ${user.username}, PO status: ${po.poStatus}`
        );
        po.activityLogs = reduceArrayContents(po.activityLogs, ACTIVITY_LOGS_LIMIT);
    }
}

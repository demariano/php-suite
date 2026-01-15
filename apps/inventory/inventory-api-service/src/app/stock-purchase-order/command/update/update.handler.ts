import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockPurchaseOrderDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateStockPurchaseOrderCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateStockPurchaseOrderCommand)
export class UpdateStockPurchaseOrderHandler implements ICommandHandler<UpdateStockPurchaseOrderCommand> {
    protected readonly logger = new Logger(UpdateStockPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateStockPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.stockPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Stock purchase order not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);

        this.applyUpdates(existing, command.stockPurchaseOrderDto, command.user, approveDirect);

        try {
            const updated = await this.stockPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<StockPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update stock purchase order', error as Error);
            throw new BadRequestException('Failed to update stock purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: StockPurchaseOrderDto,
        payload: StockPurchaseOrderDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        const hasDeliveries =
            existing.deliveredPurchaseOrderDetails && existing.deliveredPurchaseOrderDetails.length > 0;

        if (hasDeliveries) {
            const isAttemptingMainFieldUpdate =
                (payload.supplierId !== undefined && payload.supplierId !== existing.supplierId) ||
                (payload.supplierName !== undefined && payload.supplierName !== existing.supplierName) ||
                (payload.poDate !== undefined && payload.poDate !== existing.poDate) ||
                (payload.docNo !== undefined && payload.docNo !== existing.docNo) ||
                (payload.purchaseOrderDetails !== undefined &&
                    JSON.stringify(payload.purchaseOrderDetails) !== JSON.stringify(existing.purchaseOrderDetails));

            if (isAttemptingMainFieldUpdate) {
                throw new BadRequestException(
                    'Cannot update purchase order details when deliveries have been recorded. Only delivery records can be modified.'
                );
            }

            existing.deliveredPurchaseOrderDetails =
                payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails;
            existing.activityLogs.push(`Date: ${timestamp}, Delivery records updated by ${user.username}`);
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            return;
        }

        if (approveDirect) {
            existing.supplierId = payload.supplierId ?? existing.supplierId;
            existing.supplierName = payload.supplierName ?? existing.supplierName;
            existing.poDate = payload.poDate ?? existing.poDate;
            existing.docNo = payload.docNo ?? existing.docNo;
            existing.poStatus = payload.poStatus ?? existing.poStatus;
            existing.purchaseOrderDetails = payload.purchaseOrderDetails ?? existing.purchaseOrderDetails;
            existing.deliveredPurchaseOrderDetails =
                payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Stock purchase order updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                supplierId: payload.supplierId ?? existing.supplierId,
                supplierName: payload.supplierName ?? existing.supplierName,
                poDate: payload.poDate ?? existing.poDate,
                docNo: payload.docNo ?? existing.docNo,
                poStatus: payload.poStatus ?? existing.poStatus,
                purchaseOrderDetails: payload.purchaseOrderDetails ?? existing.purchaseOrderDetails,
                deliveredPurchaseOrderDetails:
                    payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Stock purchase order update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}

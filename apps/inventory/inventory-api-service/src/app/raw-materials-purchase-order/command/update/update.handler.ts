import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsPurchaseOrderDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRawMaterialsPurchaseOrderCommand } from './update.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateRawMaterialsPurchaseOrderCommand)
export class UpdateRawMaterialsPurchaseOrderHandler implements ICommandHandler<UpdateRawMaterialsPurchaseOrderCommand> {
    protected readonly logger = new Logger(UpdateRawMaterialsPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);

        this.applyUpdates(existing, command.rawMaterialsPurchaseOrderDto, command.user, approveDirect);

        try {
            const updated = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(updated, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to update raw materials purchase order', error as Error);
            throw new BadRequestException('Failed to update raw materials purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private applyUpdates(
        existing: RawMaterialsPurchaseOrderDto,
        payload: RawMaterialsPurchaseOrderDto,
        user: UserCognito,
        approveDirect: boolean
    ): void {
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];

        // Check if deliveries exist - if so, only allow delivery field updates
        const hasDeliveries =
            existing.deliveredPurchaseOrderDetails && existing.deliveredPurchaseOrderDetails.length > 0;

        if (hasDeliveries) {
            // Check if user is trying to modify main fields (not delivery-related)
            const isAttemptingMainFieldUpdate =
                (payload.rawMaterialSupplierId !== undefined &&
                    payload.rawMaterialSupplierId !== existing.rawMaterialSupplierId) ||
                (payload.rawMaterialSupplierName !== undefined &&
                    payload.rawMaterialSupplierName !== existing.rawMaterialSupplierName) ||
                (payload.poDate !== undefined && payload.poDate !== existing.poDate) ||
                (payload.docNo !== undefined && payload.docNo !== existing.docNo) ||
                (payload.purchaseOrderDetails !== undefined &&
                    JSON.stringify(payload.purchaseOrderDetails) !== JSON.stringify(existing.purchaseOrderDetails));

            if (isAttemptingMainFieldUpdate) {
                throw new BadRequestException(
                    'Cannot update purchase order details when deliveries have been recorded. Only delivery records can be modified.'
                );
            }

            // Only allow delivery field updates
            existing.deliveredPurchaseOrderDetails =
                payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails;
            existing.activityLogs.push(`Date: ${timestamp}, Delivery records updated by ${user.username}`);
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            return;
        }

        if (approveDirect) {
            existing.rawMaterialSupplierId = payload.rawMaterialSupplierId ?? existing.rawMaterialSupplierId;
            existing.rawMaterialSupplierName = payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName;
            existing.poDate = payload.poDate ?? existing.poDate;
            existing.docNo = payload.docNo ?? existing.docNo;
            existing.poStatus = payload.poStatus ?? existing.poStatus;
            existing.purchaseOrderDetails = payload.purchaseOrderDetails ?? existing.purchaseOrderDetails;
            existing.deliveredPurchaseOrderDetails =
                payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails;
            existing.status = StatusEnum.ACTIVE;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials purchase order updated by ${user.username}, status set to ACTIVE`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
            existing.forApprovalVersion = {};
            existing.changeReason = undefined;
        } else {
            existing.status = StatusEnum.FOR_APPROVAL;
            existing.forApprovalVersion = {
                rawMaterialSupplierId: payload.rawMaterialSupplierId ?? existing.rawMaterialSupplierId,
                rawMaterialSupplierName: payload.rawMaterialSupplierName ?? existing.rawMaterialSupplierName,
                poDate: payload.poDate ?? existing.poDate,
                docNo: payload.docNo ?? existing.docNo,
                poStatus: payload.poStatus ?? existing.poStatus,
                purchaseOrderDetails: payload.purchaseOrderDetails ?? existing.purchaseOrderDetails,
                deliveredPurchaseOrderDetails:
                    payload.deliveredPurchaseOrderDetails ?? existing.deliveredPurchaseOrderDetails,
            } as Record<string, unknown>;
            existing.changeReason = payload.changeReason;
            existing.activityLogs.push(
                `Date: ${timestamp}, Raw materials purchase order update requested by ${user.username} for approval`
            );
            existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }
}

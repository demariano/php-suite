import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsPurchaseOrderDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    RawMaterialsPurchaseOrderDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
} from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRawMaterialsPurchaseOrderCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteRawMaterialsPurchaseOrderCommand)
export class DeleteRawMaterialsPurchaseOrderHandler implements ICommandHandler<DeleteRawMaterialsPurchaseOrderCommand> {
    protected readonly logger = new Logger(DeleteRawMaterialsPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract,
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        if (approveDirect) {
            await this.revertDeliveredStock(existing, command.user);
        }

        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Raw materials purchase order deleted by ${command.user.username}`
                : `Date: ${timestamp}, Raw materials purchase order marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DELETION;

        try {
            const result = approveDirect
                ? await this.rawMaterialsPurchaseOrderDatabaseService.deleteRecord(existing)
                : await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<RawMaterialsPurchaseOrderDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete raw materials purchase order', error as Error);
            throw new BadRequestException('Failed to delete raw materials purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private async revertDeliveredStock(po: RawMaterialsPurchaseOrderDto, user: UserCognito): Promise<void> {
        for (const delivery of po.deliveredPurchaseOrderDetails || []) {
            for (const line of delivery.rawMaterials || []) {
                const lotNo = line.lotNo || '';
                const name = line.rawMaterialName || '';
                const qtyDelta = line.deliveredQty ?? 0;

                if (qtyDelta <= 0) {
                    continue;
                }

                const existingStock = await this.rawMaterialsStockDatabaseService.findRecordByNameAndLotNo(name, lotNo);

                if (!existingStock) {
                    throw new BadRequestException(
                        `Cannot deduct stock for ${name} lot ${
                            lotNo || 'N/A'
                        } because no matching stock record was found`
                    );
                }

                existingStock.qty = Math.max(0, (existingStock.qty || 0) - qtyDelta);
                existingStock.activityLogs = existingStock.activityLogs || [];
                existingStock.activityLogs.push(
                    `Date: ${delivery.deliveryDate || 'N/A'}, Deducted ${qtyDelta} from PO ${
                        po.rawMaterialsPurchaseOrderId
                    } by ${user.username} (PO deleted)`
                );
                existingStock.activityLogs = reduceArrayContents(existingStock.activityLogs, ACTIVITY_LOGS_LIMIT);

                await this.rawMaterialsStockDatabaseService.updateRecord(existingStock);
            }
        }
    }
}

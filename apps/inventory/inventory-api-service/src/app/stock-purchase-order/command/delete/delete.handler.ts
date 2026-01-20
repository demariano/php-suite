import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockPurchaseOrderDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract, StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteStockPurchaseOrderCommand } from './delete.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteStockPurchaseOrderCommand)
export class DeleteStockPurchaseOrderHandler implements ICommandHandler<DeleteStockPurchaseOrderCommand> {
    protected readonly logger = new Logger(DeleteStockPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract,
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteStockPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        const existing = await this.stockPurchaseOrderDatabaseService.findRecordById(command.recordId);
        if (!existing) {
            throw new NotFoundException(`Stock purchase order not found for ID: ${command.recordId}`);
        }

        const approveDirect = this.hasApprovalPermission(command.user);
        if (approveDirect) {
            await this.revertDeliveredStock(existing, command.user);
        }

        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        existing.activityLogs = existing.activityLogs || [];
        existing.activityLogs.push(
            approveDirect
                ? `Date: ${timestamp}, Stock purchase order deleted by ${command.user.username}`
                : `Date: ${timestamp}, Stock purchase order marked for deletion by ${command.user.username}`
        );
        existing.activityLogs = reduceArrayContents(existing.activityLogs, ACTIVITY_LOGS_LIMIT);
        existing.status = StatusEnum.FOR_DELETION;

        try {
            const result = approveDirect
                ? await this.stockPurchaseOrderDatabaseService.deleteRecord(existing)
                : await this.stockPurchaseOrderDatabaseService.updateRecord(existing);
            return new ResponseDto<StockPurchaseOrderDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error('Failed to delete stock purchase order', error as Error);
            throw new BadRequestException('Failed to delete stock purchase order');
        }
    }

    private hasApprovalPermission(user: UserCognito): boolean {
        return (user.roles || []).some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN);
    }

    private async revertDeliveredStock(po: StockPurchaseOrderDto, user: UserCognito): Promise<void> {
        for (const delivery of po.deliveredPurchaseOrderDetails || []) {
            for (const line of delivery.stockItems || []) {
                const lotNo = line.lotNo || '';
                const productId = line.productId || '';
                const qtyDelta = line.deliveredQty ?? 0;

                if (qtyDelta <= 0) {
                    continue;
                }

                const stockRecords = await this.stockDatabaseService.findAllRecordsByProductAndLot(productId, lotNo);

                if (!stockRecords || stockRecords.length === 0) {
                    throw new BadRequestException(
                        `Cannot deduct stock for product ${productId} lot ${
                            lotNo || 'N/A'
                        } because no matching stock record was found`
                    );
                }

                for (const stockRecord of stockRecords) {
                    stockRecord.totalQuantity = Math.max(0, (stockRecord.totalQuantity || 0) - qtyDelta);
                    stockRecord.activityLogs = stockRecord.activityLogs || [];
                    stockRecord.activityLogs.push(
                        `Date: ${delivery.deliveryDate || 'N/A'}, Deducted ${qtyDelta} from PO ${
                            po.docNo || po.stockPurchaseOrderId
                        } by ${user.username} (PO deleted)`
                    );
                    stockRecord.activityLogs = reduceArrayContents(stockRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

                    await this.stockDatabaseService.updateRecord(stockRecord);
                }
            }
        }
    }
}

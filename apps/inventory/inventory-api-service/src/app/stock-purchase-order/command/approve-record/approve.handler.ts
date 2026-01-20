import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    ResponseDto,
    StatusEnum,
    StockPurchaseOrderDto,
    StockPurchaseOrderStatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract, StockPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveStockPurchaseOrderCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveStockPurchaseOrderCommand)
export class ApproveStockPurchaseOrderHandler implements ICommandHandler<ApproveStockPurchaseOrderCommand> {
    protected readonly logger = new Logger(ApproveStockPurchaseOrderHandler.name);

    constructor(
        @Inject('StockPurchaseOrderDatabaseService')
        private readonly stockPurchaseOrderDatabaseService: StockPurchaseOrderDatabaseServiceAbstract,
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveStockPurchaseOrderCommand
    ): Promise<ResponseDto<StockPurchaseOrderDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for stock purchase order: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Stock purchase order approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<StockPurchaseOrderDto> {
        const record = await this.stockPurchaseOrderDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Stock purchase order not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock purchase order not found for ID: ${recordId}`);
        }

        return record;
    }

    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for approval');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can approve records');
        }
    }

    private async processApproval(
        existingRecord: StockPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<StockPurchaseOrderDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord, user);
            default:
                throw new BadRequestException(
                    `Cannot approve stock purchase order with status: ${existingRecord.status}`
                );
        }
    }

    private async approveRecord(
        existingRecord: StockPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<StockPurchaseOrderDto>> {
        const forApprovalVersion = existingRecord.forApprovalVersion || {};

        existingRecord.supplierId = (forApprovalVersion.supplierId as string) || existingRecord.supplierId;
        existingRecord.supplierName = (forApprovalVersion.supplierName as string) || existingRecord.supplierName;
        existingRecord.poDate = (forApprovalVersion.poDate as string) || existingRecord.poDate;
        existingRecord.docNo = (forApprovalVersion.docNo as string) || existingRecord.docNo;
        existingRecord.poStatus =
            (forApprovalVersion.poStatus as StockPurchaseOrderStatusEnum) || existingRecord.poStatus;
        existingRecord.purchaseOrderDetails =
            (forApprovalVersion.purchaseOrderDetails as any[]) || existingRecord.purchaseOrderDetails;
        existingRecord.deliveredPurchaseOrderDetails =
            (forApprovalVersion.deliveredPurchaseOrderDetails as any[]) || existingRecord.deliveredPurchaseOrderDetails;

        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock purchase order approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.stockPurchaseOrderDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<StockPurchaseOrderDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(
        existingRecord: StockPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<StockPurchaseOrderDto>> {
        existingRecord.changeReason = null;

        // Revert delivered stock before deletion
        await this.revertDeliveredStock(existingRecord, user);

        await this.stockPurchaseOrderDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockPurchaseOrderDto>(existingRecord, HTTP_STATUS_OK);
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
                        } by ${user.username} (PO deletion approved)`
                    );
                    stockRecord.activityLogs = reduceArrayContents(stockRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

                    await this.stockDatabaseService.updateRecord(stockRecord);
                }
            }
        }
    }

    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approve request for ${recordId}:`, error);

        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
            throw error;
        }

        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}

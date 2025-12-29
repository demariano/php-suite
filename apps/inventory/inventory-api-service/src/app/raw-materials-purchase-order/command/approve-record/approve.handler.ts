import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialsPurchaseOrderDto,
    RawMaterialsPurchaseOrderStatusEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    RawMaterialsPurchaseOrderDatabaseServiceAbstract,
    RawMaterialsStockDatabaseServiceAbstract,
} from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialsPurchaseOrderCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialsPurchaseOrderCommand)
export class ApproveRawMaterialsPurchaseOrderHandler
    implements ICommandHandler<ApproveRawMaterialsPurchaseOrderCommand>
{
    protected readonly logger = new Logger(ApproveRawMaterialsPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract,
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw materials purchase order: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Raw materials purchase order approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<RawMaterialsPurchaseOrderDto> {
        const record = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw materials purchase order not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${recordId}`);
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
        existingRecord: RawMaterialsPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord, user);
            default:
                throw new BadRequestException(
                    `Cannot approve raw materials purchase order with status: ${existingRecord.status}`
                );
        }
    }

    private async approveRecord(
        existingRecord: RawMaterialsPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        const forApprovalVersion = existingRecord.forApprovalVersion || {};

        existingRecord.rawMaterialSupplierId =
            (forApprovalVersion.rawMaterialSupplierId as string) || existingRecord.rawMaterialSupplierId;
        existingRecord.rawMaterialSupplierName =
            (forApprovalVersion.rawMaterialSupplierName as string) || existingRecord.rawMaterialSupplierName;
        existingRecord.poDate = (forApprovalVersion.poDate as string) || existingRecord.poDate;
        existingRecord.docNo = (forApprovalVersion.docNo as string) || existingRecord.docNo;
        existingRecord.poStatus =
            (forApprovalVersion.poStatus as RawMaterialsPurchaseOrderStatusEnum) || existingRecord.poStatus;
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
        })}, Raw materials purchase order approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(
        existingRecord: RawMaterialsPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        existingRecord.changeReason = null;

        // Revert delivered stock before deletion
        await this.revertDeliveredStock(existingRecord, user);

        await this.rawMaterialsPurchaseOrderDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(existingRecord, HTTP_STATUS_OK);
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
                    } by ${user.username} (PO deletion approved)`
                );
                existingStock.activityLogs = reduceArrayContents(existingStock.activityLogs, ACTIVITY_LOGS_LIMIT);

                await this.rawMaterialsStockDatabaseService.updateRecord(existingStock);
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

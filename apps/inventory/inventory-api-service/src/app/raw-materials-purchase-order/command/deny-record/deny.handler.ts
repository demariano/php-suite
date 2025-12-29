import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, RawMaterialsPurchaseOrderDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyRawMaterialsPurchaseOrderCommand } from './deny.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DenyRawMaterialsPurchaseOrderCommand)
export class DenyRawMaterialsPurchaseOrderHandler implements ICommandHandler<DenyRawMaterialsPurchaseOrderCommand> {
    protected readonly logger = new Logger(DenyRawMaterialsPurchaseOrderHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        command: DenyRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for raw materials purchase order: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processDenial(existingRecord, command);
            this.logger.log(`Raw materials purchase order denied successfully: ${command.recordId}`);
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
            throw new ForbiddenException('User roles are required for denial');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can deny records');
        }
    }

    private async processDenial(
        existingRecord: RawMaterialsPurchaseOrderDto,
        command: DenyRawMaterialsPurchaseOrderCommand
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        if (command.approverMessage) {
            existingRecord.approverMessage = command.approverMessage;
        }

        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyRecord(existingRecord, command.user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command.user);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot deny raw materials purchase order with status: ${existingRecord.status}`
                );
        }
    }

    private async denyRecord(
        existingRecord: RawMaterialsPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw materials purchase order changes denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        if (existingRecord.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Raw materials purchase order denied by ${user.username}, approver message: ${
                    existingRecord.approverMessage
                }`
            );
        }

        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;

        const updatedRecord = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async denyDeletion(
        existingRecord: RawMaterialsPurchaseOrderDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw materials purchase order deletion denied by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialsPurchaseOrderDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async deleteRecord(existingRecord: RawMaterialsPurchaseOrderDto): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialsPurchaseOrderDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(existingRecord, HTTP_STATUS_OK);
    }

    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing deny request for ${recordId}:`, error);

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

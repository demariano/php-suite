import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    RawMaterialSupplierDto,
    RawMaterialSupplierEventDto,
    RawMaterialSupplierEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-aws-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRawMaterialSupplierCommand } from './approve.command';

const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveRawMaterialSupplierCommand)
export class ApproveRawMaterialSupplierHandler implements ICommandHandler<ApproveRawMaterialSupplierCommand> {
    protected readonly logger = new Logger(ApproveRawMaterialSupplierHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(
        command: ApproveRawMaterialSupplierCommand
    ): Promise<ResponseDto<RawMaterialSupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for raw material supplier: ${command.recordId}`);

        try {
            const existingRecord = await this.fetchRecord(command.recordId);
            this.validateUserAuthorization(command.user.roles);
            const result = await this.processApproval(existingRecord, command.user);
            this.logger.log(`Raw material supplier approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    private async fetchRecord(recordId: string): Promise<RawMaterialSupplierDto> {
        const record = await this.rawMaterialSupplierDatabaseService.findRecordById(recordId);

        if (!record) {
            this.logger.warn(`Raw material supplier not found for ID: ${recordId}`);
            throw new NotFoundException(`Raw material supplier not found for ID: ${recordId}`);
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
        existingRecord: RawMaterialSupplierDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveRecord(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve raw material supplier with status: ${existingRecord.status}`
                );
        }
    }

    private async approveRecord(
        existingRecord: RawMaterialSupplierDto,
        user: UserCognito
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        // Capture old name before applying changes
        const oldRawMaterialSupplierName = existingRecord.rawMaterialSupplierName;

        const forApprovalVersion = existingRecord.forApprovalVersion || {};
        existingRecord.rawMaterialSupplierName =
            (forApprovalVersion.rawMaterialSupplierName as string) || existingRecord.rawMaterialSupplierName;
        existingRecord.forApprovalVersion = {};
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;

        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material supplier approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const updatedRecord = await this.rawMaterialSupplierDatabaseService.updateRecord(existingRecord);

        // Publish event if raw material supplier name changed
        if (oldRawMaterialSupplierName !== updatedRecord.rawMaterialSupplierName) {
            await this.publishRawMaterialSupplierUpdatedEvent(
                updatedRecord.rawMaterialSupplierId,
                updatedRecord.rawMaterialSupplierName
            );
        }

        return new ResponseDto<RawMaterialSupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    private async approveDeletion(
        existingRecord: RawMaterialSupplierDto
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        existingRecord.changeReason = null;
        await this.rawMaterialSupplierDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<RawMaterialSupplierDto>(existingRecord, HTTP_STATUS_OK);
    }

    private async approveDeactivation(
        existingRecord: RawMaterialSupplierDto
    ): Promise<ResponseDto<RawMaterialSupplierDto>> {
        existingRecord.changeReason = null;
        existingRecord.approverMessage = null;
        existingRecord.status = StatusEnum.INACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Raw material supplier deactivation approved, status set to ${StatusEnum.INACTIVE}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.rawMaterialSupplierDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<RawMaterialSupplierDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Publish RAW_MATERIAL_SUPPLIER_UPDATED event to INVENTORY_EVENT_SQS
     */
    private async publishRawMaterialSupplierUpdatedEvent(
        rawMaterialSupplierId: string,
        newRawMaterialSupplierName: string
    ): Promise<void> {
        try {
            const eventDto: RawMaterialSupplierEventDto = {
                rawMaterialSupplierId,
                newRawMaterialSupplierName,
                eventType: RawMaterialSupplierEventEnum.RAW_MATERIAL_SUPPLIER_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const inventoryQueueUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
            if (!inventoryQueueUrl) {
                this.logger.error('INVENTORY_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(inventoryQueueUrl, JSON.stringify(eventDto));
            this.logger.log(
                `Published RAW_MATERIAL_SUPPLIER_UPDATED event to INVENTORY_EVENT_SQS for rawMaterialSupplierId: ${rawMaterialSupplierId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to publish RAW_MATERIAL_SUPPLIER_UPDATED event for rawMaterialSupplierId: ${rawMaterialSupplierId}`,
                error
            );
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

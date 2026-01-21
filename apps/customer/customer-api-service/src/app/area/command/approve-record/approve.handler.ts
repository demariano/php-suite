import { UserCognito } from '@auth-guard-lib';
import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, AreaEventDto, AreaEventEnum, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveAreaCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveAreaCommand)
export class ApproveAreaHandler implements ICommandHandler<ApproveAreaCommand> {
    protected readonly logger = new Logger(ApproveAreaHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveAreaCommand): Promise<ResponseDto<AreaDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for area: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateAreaExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the area record exists
     */
    private async validateAreaExists(recordId: string): Promise<AreaDto> {
        const existingRecord = await this.areaDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Area not found: ${recordId}`);
            throw new NotFoundException(`Area record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve area change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: AreaDto, user: UserCognito): Promise<ResponseDto<AreaDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveArea(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve area with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves an area for approval
     */
    private async approveArea(existingRecord: AreaDto, user: UserCognito): Promise<ResponseDto<AreaDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        const oldAreaName = existingRecord.areaName;
        const newAreaName = forApprovalVersion.areaName as string;

        existingRecord.areaName = newAreaName;
        existingRecord.towns = forApprovalVersion.towns as string[];
        existingRecord.territoryManagerId = forApprovalVersion.territoryManagerId as string;
        existingRecord.territoryManagerName = forApprovalVersion.territoryManagerName as string;
        existingRecord.idPrefix = forApprovalVersion.idPrefix as string;
        existingRecord.forApprovalVersion = {};

        // Reset changeReason after applying changes
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.areaDatabaseService.updateRecord(existingRecord);

        // If area name changed, publish event
        if (oldAreaName !== newAreaName) {
            await this.publishAreaNameChangeEvent(existingRecord.areaId, newAreaName);
        }

        this.logger.log(`Area approved successfully: ${existingRecord.areaId}`);
        return new ResponseDto<AreaDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of an area
     */
    private async approveDeletion(existingRecord: AreaDto): Promise<ResponseDto<AreaDto>> {
        // Reset changeReason before deleting
        existingRecord.changeReason = null;
        await this.areaDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Area deletion approved: ${existingRecord.areaId}`);
        return new ResponseDto<AreaDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of an area (soft delete)
     */
    private async approveDeactivation(existingRecord: AreaDto): Promise<ResponseDto<AreaDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.areaDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Area deactivation approved: ${existingRecord.areaId}`);
        return new ResponseDto<AreaDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
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

    /**
     * Publishes area name change event to SQS
     */
    private async publishAreaNameChangeEvent(areaId: string, newAreaName: string): Promise<void> {
        try {
            this.logger.log(`Publishing area name change event for areaId: ${areaId}`);

            const event: AreaEventDto = {
                eventType: AreaEventEnum.AREA_UPDATED,
                areaId: areaId,
                newAreaName: newAreaName,
                timestamp: new Date().toISOString(),
            };

            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(invoiceEventSQSUrl, JSON.stringify(event));

            this.logger.log(`Area name change event published for areaId: ${areaId}`);
        } catch (error) {
            this.logger.error(`Failed to publish area name change event for areaId: ${areaId}`, error);
            // Don't throw - this is a non-critical operation
        }
    }
}

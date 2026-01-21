import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TermsDto, TermsEventDto, TermsEventEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTermsCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateTermsCommand)
export class UpdateTermsHandler implements ICommandHandler<UpdateTermsCommand> {
    protected readonly logger = new Logger(UpdateTermsHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateTermsCommand): Promise<ResponseDto<TermsDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for terms: ${command.recordId}`);

        try {
            // Fetch and validate existing terms record
            const existingRecord = await this.fetchTermsById(command.recordId);

            // Validate that terms name doesn't already exist (if changed)
            await this.validateTermsNameUnique(command.termsDto.termsName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            await this.updateTermsStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.termsDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Terms updated successfully: ${updatedRecord.termsId}`);
            return new ResponseDto<TermsDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a terms record by ID
     */
    private async fetchTermsById(recordId: string): Promise<TermsDto> {
        const termsRecord = await this.termsDatabaseService.findRecordById(recordId);

        if (!termsRecord) {
            this.logger.warn(`Terms not found for ID: ${recordId}`);
            throw new NotFoundException(`Terms not found for ID: ${recordId}`);
        }

        return termsRecord;
    }

    /**
     * Validates that the terms name is unique (excluding current record)
     */
    private async validateTermsNameUnique(termsName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.termsDatabaseService.findRecordByName(termsName);

        if (existingRecord && existingRecord.termsId !== currentRecordId) {
            this.logger.warn(`Terms name already exists: ${termsName}`);
            throw new BadRequestException('Terms name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates terms status and activity logs based on user permissions
     */
    private async updateTermsStatus(
        command: UpdateTermsCommand,
        existingRecord: TermsDto,
        hasApprovalPermission: boolean
    ): Promise<void> {
        if (hasApprovalPermission) {
            // Capture old terms name BEFORE updating
            const oldTermsName = existingRecord.termsName;

            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.termsName = command.termsDto.termsName;
            existingRecord.days = command.termsDto.days;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;

            // Publish event if terms name changed
            if (oldTermsName !== command.termsDto.termsName) {
                await this.publishTermsUpdatedEvent(existingRecord.termsId, command.termsDto.termsName);
            }
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.termsDto);
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.termsDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingRecord.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingRecord.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingRecord.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingRecord.changeReason = undefined;
            }

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                termsName: command.termsDto.termsName,
                days: command.termsDto.days,
            };
        }
    }

    /**
     * Publishes a terms updated event to the message queue
     */
    private async publishTermsUpdatedEvent(termsId: string, newTermsName: string): Promise<void> {
        try {
            const eventDto: TermsEventDto = {
                termsId,
                newTermsName,
                eventType: TermsEventEnum.TERMS_UPDATED,
                timestamp: new Date().toISOString(),
            };

            const queueUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            if (!queueUrl) {
                this.logger.error('INVOICE_EVENT_SQS queue URL not configured');
                return;
            }

            await this.messageQueueService.sendMessageToSQS(queueUrl, JSON.stringify(eventDto));
            this.logger.log(`Published TERMS_UPDATED event for termsId: ${termsId}`);
        } catch (error) {
            this.logger.error(`Failed to publish TERMS_UPDATED event for termsId: ${termsId}`, error);
            // Don't throw - event publishing failure shouldn't break the update
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
}

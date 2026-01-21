import { UserCognito } from '@auth-guard-lib';
import { TermsDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, TermsDto, TermsEventDto, TermsEventEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveTermsCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveTermsCommand)
export class ApproveTermsHandler implements ICommandHandler<ApproveTermsCommand> {
    protected readonly logger = new Logger(ApproveTermsHandler.name);

    constructor(
        @Inject('TermsDatabaseService')
        private readonly termsDatabaseService: TermsDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: ApproveTermsCommand): Promise<ResponseDto<TermsDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for terms: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTermsExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the terms record exists
     */
    private async validateTermsExists(recordId: string): Promise<TermsDto> {
        const existingRecord = await this.termsDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Terms not found: ${recordId}`);
            throw new NotFoundException(`Terms record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve terms change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: TermsDto, user: UserCognito): Promise<ResponseDto<TermsDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveTerms(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.approveDeactivation(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve terms with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a terms for approval
     */
    private async approveTerms(existingRecord: TermsDto, user: UserCognito): Promise<ResponseDto<TermsDto>> {
        // Capture old terms name BEFORE updating
        const oldTermsName = existingRecord.termsName;

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.termsName = forApprovalVersion.termsName as string;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.termsDatabaseService.updateRecord(existingRecord);

        // Publish event if terms name changed
        if (oldTermsName !== updatedRecord.termsName) {
            await this.publishTermsUpdatedEvent(updatedRecord.termsId, updatedRecord.termsName);
        }

        this.logger.log(`Terms approved successfully: ${existingRecord.termsId}`);
        return new ResponseDto<TermsDto>(updatedRecord, HTTP_STATUS_OK);
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
            // Don't throw - event publishing failure shouldn't break the approval
        }
    }

    /**
     * Approves deletion of a terms
     */
    private async approveDeletion(existingRecord: TermsDto): Promise<ResponseDto<TermsDto>> {
        await this.termsDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Terms deletion approved: ${existingRecord.termsId}`);
        return new ResponseDto<TermsDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deactivation of a terms (soft delete)
     */
    private async approveDeactivation(existingRecord: TermsDto): Promise<ResponseDto<TermsDto>> {
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.INACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs ?? [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Terms deactivation approved, status set to ${StatusEnum.INACTIVE}`
        );
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        const updatedRecord = await this.termsDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Terms deactivation approved: ${existingRecord.termsId}`);
        return new ResponseDto<TermsDto>(updatedRecord, HTTP_STATUS_OK);
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
}

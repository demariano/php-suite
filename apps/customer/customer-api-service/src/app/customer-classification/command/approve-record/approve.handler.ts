import { UserCognito } from '@auth-guard-lib';
import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveCustomerClassificationCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveCustomerClassificationCommand)
export class ApproveCustomerClassificationHandler implements ICommandHandler<ApproveCustomerClassificationCommand> {
    protected readonly logger = new Logger(ApproveCustomerClassificationHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(
        command: ApproveCustomerClassificationCommand
    ): Promise<ResponseDto<CustomerClassificationDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for customer classification: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateCustomerClassificationExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the customer classification record exists
     */
    private async validateCustomerClassificationExists(recordId: string): Promise<CustomerClassificationDto> {
        const existingRecord = await this.customerClassificationDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Customer classification not found: ${recordId}`);
            throw new NotFoundException(`Customer classification record not found for id ${recordId}`);
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
            throw new ForbiddenException(
                'Current user is not authorized to approve customer classification change request'
            );
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: CustomerClassificationDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveCustomerClassification(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot approve customer classification with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Approves a customer classification for approval
     */
    private async approveCustomerClassification(
        existingRecord: CustomerClassificationDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.customerClassificationName = forApprovalVersion.customerClassificationName as string;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.customerClassificationDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Customer classification approved successfully: ${existingRecord.customerClassificationId}`);
        return new ResponseDto<CustomerClassificationDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a customer classification
     */
    private async approveDeletion(
        existingRecord: CustomerClassificationDto
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        await this.customerClassificationDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Customer classification deletion approved: ${existingRecord.customerClassificationId}`);
        return new ResponseDto<CustomerClassificationDto>(existingRecord, HTTP_STATUS_OK);
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

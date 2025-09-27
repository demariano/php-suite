import { UserCognito } from '@auth-guard-lib';
import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyCustomerClassificationCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyCustomerClassificationCommand)
export class DenyCustomerClassificationHandler implements ICommandHandler<DenyCustomerClassificationCommand> {
    protected readonly logger = new Logger(DenyCustomerClassificationHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(
        command: DenyCustomerClassificationCommand
    ): Promise<ResponseDto<CustomerClassificationDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for customer classification: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateCustomerClassificationExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException(
                'Current user is not authorized to deny customer classification change request'
            );
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: CustomerClassificationDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyCustomerClassification(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(
                    `Cannot deny customer classification with status: ${existingRecord.status}`
                );
        }
    }

    /**
     * Denies a customer classification for approval
     */
    private async denyCustomerClassification(
        existingRecord: CustomerClassificationDto,
        user: UserCognito
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.customerClassificationDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Customer classification denied successfully: ${existingRecord.customerClassificationId}`);
        return new ResponseDto<CustomerClassificationDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a customer classification
     */
    private async denyDeletion(
        existingRecord: CustomerClassificationDto
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        this.logger.log(`Customer classification deletion denied: ${existingRecord.customerClassificationId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.customerClassificationDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<CustomerClassificationDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a customer classification when it is a new record and it was denied
     */
    private async deleteRecord(
        existingRecord: CustomerClassificationDto
    ): Promise<ResponseDto<CustomerClassificationDto>> {
        this.logger.log(`Customer classification deleted: ${existingRecord.customerClassificationId}`);
        await this.customerClassificationDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<CustomerClassificationDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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

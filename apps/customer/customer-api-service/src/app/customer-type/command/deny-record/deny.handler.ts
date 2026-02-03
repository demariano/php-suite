import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyCustomerTypeCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyCustomerTypeCommand)
export class DenyCustomerTypeHandler implements ICommandHandler<DenyCustomerTypeCommand> {
    protected readonly logger = new Logger(DenyCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenyCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for customer type: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateCustomerTypeExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the customer type record exists
     */
    private async validateCustomerTypeExists(recordId: string): Promise<CustomerTypeDto> {
        const existingRecord = await this.customerTypeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Customer type not found: ${recordId}`);
            throw new NotFoundException(`Customer type record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny customer type change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: CustomerTypeDto,
        command: DenyCustomerTypeCommand
    ): Promise<ResponseDto<CustomerTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyCustomerType(existingRecord, command);
            case StatusEnum.FOR_DEACTIVATION:
                return await this.denyDeactivation(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny customer type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a customer type for approval
     */
    private async denyCustomerType(
        existingRecord: CustomerTypeDto,
        command: DenyCustomerTypeCommand
    ): Promise<ResponseDto<CustomerTypeDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Add activity log for approver message if provided
        if (command.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type denied by ${command.user.username}, approver message: ${command.approverMessage}`
            );
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};
        existingRecord.approverMessage = null;
        // Update record in database
        const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Customer type denied successfully: ${existingRecord.customerTypeId}`);
        return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deactivation of a customer type
     */
    private async denyDeactivation(
        existingRecord: CustomerTypeDto,
        command: DenyCustomerTypeCommand
    ): Promise<ResponseDto<CustomerTypeDto>> {
        this.logger.log(`Customer type deactivation denied: ${existingRecord.customerTypeId}`);
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log for denial
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type deactivation denied by ${command.user.username}, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Add approver message if provided
        if (command.approverMessage) {
            existingRecord.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type deactivation denied by ${command.user.username}, approver message: ${
                    command.approverMessage
                }`
            );
        }

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;

        const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a customer type when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: CustomerTypeDto): Promise<ResponseDto<CustomerTypeDto>> {
        this.logger.log(`Customer type deleted: ${existingRecord.customerTypeId}`);
        await this.customerTypeDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<CustomerTypeDto>(existingRecord, HTTP_STATUS_OK);
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

import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenySalesTypeCommand } from './deny.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DenySalesTypeCommand)
export class DenySalesTypeHandler implements ICommandHandler<DenySalesTypeCommand> {
    protected readonly logger = new Logger(DenySalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenySalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for sales type: ${command.salesTypeId}`);

        try {
            // Check user authorization
            this.validateUserPermission(command.user.roles);

            // Fetch existing record
            const existingRecord = await this.fetchExistingSalesType(command.salesTypeId);

            // Validate that record is in a state that can be denied
            this.validateRecordCanBeDenied(existingRecord);

            // Update record with denied status
            const updatedRecord = await this.updateRecordWithDenial(command, existingRecord);

            this.logger.log(`Sales type denied successfully: ${updatedRecord.salesTypeId}`);
            return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Validates that user has permission to deny
     */
    private validateUserPermission(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new BadRequestException('User does not have permission to deny');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
        if (!hasPermission) {
            throw new BadRequestException('User does not have permission to deny');
        }
    }

    /**
     * Fetches and validates an existing sales type record
     */
    private async fetchExistingSalesType(salesTypeId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(salesTypeId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found for ID: ${salesTypeId}`);
            throw new NotFoundException(`Sales type not found for ID: ${salesTypeId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the record is in a state that can be denied
     */
    private validateRecordCanBeDenied(record: SalesTypeDto): void {
        if (record.status !== StatusEnum.FOR_APPROVAL && record.status !== StatusEnum.NEW_RECORD) {
            throw new BadRequestException('Sales type is not in a state that can be denied');
        }
    }

    /**
     * Updates the record with denied status
     */
    private async updateRecordWithDenial(
        command: DenySalesTypeCommand,
        existingRecord: SalesTypeDto
    ): Promise<SalesTypeDto> {
        const updatedRecord = { ...existingRecord };

        // Set status to ACTIVE (revert to previous state)
        updatedRecord.status = StatusEnum.ACTIVE;

        // Add denial log
        updatedRecord.activityLogs = existingRecord.activityLogs || [];
        updatedRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type denied by ${command.user.username}, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Clear forApprovalVersion if it exists
        updatedRecord.forApprovalVersion = {};

        // Update record in database
        return await this.salesTypeDatabaseService.updateRecord(updatedRecord);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, salesTypeId: string): never {
        this.logger.error(`Error processing deny request for ${salesTypeId}:`, error);

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

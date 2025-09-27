import { ErrorResponseDto, ResponseDto, StatusEnum, StockTypeDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { DeleteStockTypeCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteStockTypeCommand)
export class DeleteStockTypeHandler implements ICommandHandler<DeleteStockTypeCommand> {
    protected readonly logger = new Logger(DeleteStockTypeHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteStockTypeCommand): Promise<ResponseDto<StockTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for stock type: ${command.recordId}`);

        try {
            // Fetch and validate existing stock type record
            const existingRecord = await this.fetchStockTypeById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockTypeStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Stock type deleted successfully: ${deletedRecord.stockTypeId}`);
            return new ResponseDto<StockTypeDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a stock type record by ID
     */
    private async fetchStockTypeById(recordId: string): Promise<StockTypeDto> {
        const stockTypeRecord = await this.stockTypeDatabaseService.findRecordById(recordId);

        if (!stockTypeRecord) {
            this.logger.warn(`Stock type not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock type not found for ID: ${recordId}`);
        }

        return stockTypeRecord;
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
     * Updates stock type status and activity logs based on user permissions
     */
    private updateStockTypeStatus(
        command: DeleteStockTypeCommand,
        existingRecord: StockTypeDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.stockTypeDto.stockTypeId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.stockTypeDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock type deleted by ${command.user.username}`;
            command.stockTypeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.stockTypeDto.activityLogs = reduceArrayContents(
                command.stockTypeDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.stockTypeDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock type marked for deletion by ${command.user.username}`;
            command.stockTypeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.stockTypeDto.activityLogs = reduceArrayContents(
                command.stockTypeDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteStockTypeCommand,
        hasApprovalPermission: boolean
    ): Promise<StockTypeDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.stockTypeDatabaseService.deleteRecord(command.stockTypeDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.stockTypeDatabaseService.updateRecord(command.stockTypeDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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

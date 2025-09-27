import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockTypeDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockTypeDatabaseServiceAbstract } from '@stock-database-service';
import { ApproveStockTypeCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveStockTypeCommand)
export class ApproveStockTypeHandler implements ICommandHandler<ApproveStockTypeCommand> {
    protected readonly logger = new Logger(ApproveStockTypeHandler.name);

    constructor(
        @Inject('StockTypeDatabaseService')
        private readonly stockTypeDatabaseService: StockTypeDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveStockTypeCommand): Promise<ResponseDto<StockTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for stock type: ${command.recordId}`);

        try {
            // Fetch and validate existing stock type record
            const existingRecord = await this.fetchStockTypeById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            const result = await this.processApproval(existingRecord, command.user);

            this.logger.log(`Stock type approved successfully: ${command.recordId}`);
            return result;
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
     * Validates that the user has permission to approve records
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles are required for approval');
        }

        const hasPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasPermission) {
            throw new ForbiddenException('Only SUPER_ADMIN or ADMIN users can approve records');
        }
    }

    /**
     * Processes approval based on the current status of the record
     */
    private async processApproval(existingRecord: StockTypeDto, user: UserCognito): Promise<ResponseDto<StockTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveStockType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve stock type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a stock type record by applying forApprovalVersion changes
     */
    private async approveStockType(
        existingRecord: StockTypeDto,
        user: UserCognito
    ): Promise<ResponseDto<StockTypeDto>> {
        // Apply changes from forApprovalVersion
        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.stockTypeName = forApprovalVersion.stockTypeName as string;
        existingRecord.forApprovalVersion = {};

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock type approved by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockTypeDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a stock type record
     */
    private async approveDeletion(existingRecord: StockTypeDto): Promise<ResponseDto<StockTypeDto>> {
        this.logger.log(`Stock type deletion approved: ${existingRecord.stockTypeId}`);
        await this.stockTypeDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockTypeDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approve request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ForbiddenException
        ) {
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

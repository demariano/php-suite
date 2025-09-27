import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockDatabaseServiceAbstract } from '@stock-database-service';
import { ApproveStockCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveStockCommand)
export class ApproveStockHandler implements ICommandHandler<ApproveStockCommand> {
    protected readonly logger = new Logger(ApproveStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveStockCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing approve request for stock: ${command.recordId}`);

        try {
            // Fetch and validate existing stock record
            const existingRecord = await this.fetchStockById(command.recordId);

            // Validate user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            const result = await this.processApproval(existingRecord, command.user);

            this.logger.log(`Stock approved successfully: ${command.recordId}`);
            return result;
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a stock record by ID
     */
    private async fetchStockById(recordId: string): Promise<StockDto> {
        const stockRecord = await this.stockDatabaseService.findRecordById(recordId);

        if (!stockRecord) {
            this.logger.warn(`Stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock not found for ID: ${recordId}`);
        }

        return stockRecord;
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
    private async processApproval(existingRecord: StockDto, user: UserCognito): Promise<ResponseDto<StockDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveStock(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve stock with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a stock record by applying forApprovalVersion changes
     */
    private async approveStock(existingRecord: StockDto, user: UserCognito): Promise<ResponseDto<StockDto>> {
        // Apply changes from forApprovalVersion
        const forApprovalVersion = existingRecord.forApprovalVersion;
        if (forApprovalVersion) {
            existingRecord.productName = forApprovalVersion.productName as string;
            existingRecord.lotNo = forApprovalVersion.lotNo as string;
            existingRecord.productId = forApprovalVersion.productId as string;
            existingRecord.quantity = forApprovalVersion.quantity as number;
            existingRecord.productUnitId = forApprovalVersion.productUnitId as string;
            existingRecord.productUnitName = forApprovalVersion.productUnitName as string;
            existingRecord.expirationDate = forApprovalVersion.expirationDate as string;
        }
        existingRecord.forApprovalVersion = {};

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock approved by ${user.username}`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockDatabaseService.updateRecord(existingRecord);

        return new ResponseDto<StockDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a stock record
     */
    private async approveDeletion(existingRecord: StockDto): Promise<ResponseDto<StockDto>> {
        this.logger.log(`Stock deletion approved: ${existingRecord.stockId}`);
        await this.stockDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockDto>(existingRecord, HTTP_STATUS_OK);
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

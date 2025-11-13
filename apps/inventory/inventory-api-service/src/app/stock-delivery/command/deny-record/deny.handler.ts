import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, StatusEnum, StockDeliveryDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyStockDeliveryCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyStockDeliveryCommand)
export class DenyStockDeliveryHandler implements ICommandHandler<DenyStockDeliveryCommand> {
    protected readonly logger = new Logger(DenyStockDeliveryHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(command: DenyStockDeliveryCommand): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for stock delivery: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateStockDeliveryExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the stock delivery record exists
     */
    private async validateStockDeliveryExists(recordId: string): Promise<StockDeliveryDto> {
        const existingRecord = await this.stockDeliveryDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Stock delivery not found: ${recordId}`);
            throw new NotFoundException(`Stock delivery record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny stock delivery change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: StockDeliveryDto,
        user: UserCognito
    ): Promise<ResponseDto<StockDeliveryDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyStockDelivery(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny stock delivery with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a stock delivery for approval
     */
    private async denyStockDelivery(
        existingRecord: StockDeliveryDto,
        user: UserCognito
    ): Promise<ResponseDto<StockDeliveryDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.stockDeliveryDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Stock delivery denied successfully: ${existingRecord.stockDeliveryId}`);
        return new ResponseDto<StockDeliveryDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a stock delivery
     */
    private async denyDeletion(existingRecord: StockDeliveryDto): Promise<ResponseDto<StockDeliveryDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;
        
        // Revert to ACTIVE status
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Stock delivery deletion denied`;
        existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.stockDeliveryDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Stock delivery deletion denied: ${existingRecord.stockDeliveryId}`);
        return new ResponseDto<StockDeliveryDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a stock delivery when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: StockDeliveryDto): Promise<ResponseDto<StockDeliveryDto>> {
        // Reset changeReason to null before deleting
        existingRecord.changeReason = null;
        
        this.logger.log(`Stock delivery deleted: ${existingRecord.stockDeliveryId}`);
        await this.stockDeliveryDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<StockDeliveryDto>(existingRecord, HTTP_STATUS_OK);
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

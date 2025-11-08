import { UserCognito } from '@auth-guard-lib';
import { DeliveryDetailsDto, ErrorResponseDto, ResponseDto, StatusEnum, StockDeliveryDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveStockDeliveryCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveStockDeliveryCommand)
export class ApproveStockDeliveryHandler implements ICommandHandler<ApproveStockDeliveryCommand> {
    protected readonly logger = new Logger(ApproveStockDeliveryHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveStockDeliveryCommand): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for stock delivery: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateStockDeliveryExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve stock delivery change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: StockDeliveryDto,
        user: UserCognito
    ): Promise<ResponseDto<StockDeliveryDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveStockDelivery(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve stock delivery with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a stock delivery for approval
     */
    private async approveStockDelivery(
        existingRecord: StockDeliveryDto,
        user: UserCognito
    ): Promise<ResponseDto<StockDeliveryDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        if (forApprovalVersion) {
            existingRecord.docno = forApprovalVersion.docno as string;
            existingRecord.supplierId = forApprovalVersion.supplierId as string;
            existingRecord.supplierName = forApprovalVersion.supplierName as string;
            existingRecord.dateReceived = forApprovalVersion.dateReceived as string;
            existingRecord.deliveryDetails = forApprovalVersion.deliveryDetails as DeliveryDetailsDto[];
        }
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.stockDeliveryDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Stock delivery approved successfully: ${existingRecord.stockDeliveryId}`);
        return new ResponseDto<StockDeliveryDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a stock delivery
     */
    private async approveDeletion(existingRecord: StockDeliveryDto): Promise<ResponseDto<StockDeliveryDto>> {
        await this.stockDeliveryDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Stock delivery deletion approved: ${existingRecord.stockDeliveryId}`);
        return new ResponseDto<StockDeliveryDto>(existingRecord, HTTP_STATUS_OK);
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

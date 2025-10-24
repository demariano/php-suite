import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateReturnGoodSoldCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateReturnGoodSoldCommand)
export class UpdateReturnGoodSoldHandler implements ICommandHandler<UpdateReturnGoodSoldCommand> {
    protected readonly logger = new Logger(UpdateReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(command: UpdateReturnGoodSoldCommand): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for return good sold: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateReturnGoodSoldExists(command.recordId);

            // Check user authorization and process update
            return await this.processUpdate(existingRecord, command.returnGoodSoldDto, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the return good sold record exists
     */
    private async validateReturnGoodSoldExists(recordId: string): Promise<ReturnGoodSoldDto> {
        const existingRecord = await this.returnGoodSoldDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Return Good Sold not found: ${recordId}`);
            throw new NotFoundException(`Return Good Sold record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Processes the update based on user authorization
     */
    private async processUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        const hasAdminPermission = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

        if (hasAdminPermission) {
            return await this.directUpdate(existingRecord, updateDto, user);
        } else {
            return await this.requestApprovalUpdate(existingRecord, updateDto, user);
        }
    }

    /**
     * Direct update for admin users
     */
    private async directUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Apply changes directly
        existingRecord.invoiceId = updateDto.invoiceId;
        existingRecord.customerId = updateDto.customerId;
        existingRecord.customerName = updateDto.customerName;
        existingRecord.invoiceDocno = updateDto.invoiceDocno;
        existingRecord.rgsDocno = updateDto.rgsDocno;
        existingRecord.dateReturned = updateDto.dateReturned;
        existingRecord.originalInvoiceDetails = updateDto.originalInvoiceDetails;
        existingRecord.modifiedInvoiceDetails = updateDto.modifiedInvoiceDetails;
        existingRecord.changeReason = updateDto.changeReason;
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold updated by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Clear forApprovalVersion since it's a direct update
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold updated successfully: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Request approval update for regular users
     */
    private async requestApprovalUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Store changes in forApprovalVersion
        existingRecord.forApprovalVersion = {
            invoiceId: updateDto.invoiceId,
            customerId: updateDto.customerId,
            customerName: updateDto.customerName,
            invoiceDocno: updateDto.invoiceDocno,
            rgsDocno: updateDto.rgsDocno,
            dateReturned: updateDto.dateReturned,
            originalInvoiceDetails: updateDto.originalInvoiceDetails,
            modifiedInvoiceDetails: updateDto.modifiedInvoiceDetails,
            changeReason: updateDto.changeReason,
        };

        existingRecord.status = StatusEnum.FOR_APPROVAL;
        existingRecord.changeReason = updateDto.changeReason;

        // Add activity log
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold update requested by ${user.username}, status set to ${StatusEnum.FOR_APPROVAL}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold update requested: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

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

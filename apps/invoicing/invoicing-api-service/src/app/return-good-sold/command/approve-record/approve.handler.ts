import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveReturnGoodSoldCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveReturnGoodSoldCommand)
export class ApproveReturnGoodSoldHandler implements ICommandHandler<ApproveReturnGoodSoldCommand> {
    protected readonly logger = new Logger(ApproveReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(command: ApproveReturnGoodSoldCommand): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for return good sold: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateReturnGoodSoldExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve return good sold change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveReturnGoodSold(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve return good sold with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a return good sold for approval
     */
    private async approveReturnGoodSold(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.invoiceId = forApprovalVersion.invoiceId as string;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        existingRecord.invoiceDocno = forApprovalVersion.invoiceDocno as string;
        existingRecord.rgsDocno = forApprovalVersion.rgsDocno as string;
        existingRecord.dateReturned = forApprovalVersion.dateReturned as string;
        existingRecord.originalInvoiceDetails = forApprovalVersion.originalInvoiceDetails as Array<any>;
        existingRecord.modifiedInvoiceDetails = forApprovalVersion.modifiedInvoiceDetails as Array<any>;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold approved successfully: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a return good sold
     */
    private async approveDeletion(existingRecord: ReturnGoodSoldDto): Promise<ResponseDto<ReturnGoodSoldDto>> {
        await this.returnGoodSoldDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Return Good Sold deletion approved: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(existingRecord, HTTP_STATUS_OK);
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

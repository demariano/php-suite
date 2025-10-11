import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveSalesTypeCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveSalesTypeCommand)
export class ApproveSalesTypeHandler implements ICommandHandler<ApproveSalesTypeCommand> {
    protected readonly logger = new Logger(ApproveSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for sales type: ${command.salesTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateSalesTypeExists(command.salesTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Validates that the sales type record exists
     */
    private async validateSalesTypeExists(recordId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found: ${recordId}`);
            throw new NotFoundException(`Sales type record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve sales type change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveSalesType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve sales type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a sales type for approval
     */
    private async approveSalesType(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.salesTypeName = forApprovalVersion.salesTypeName as string;
        existingRecord.allowDiscount = forApprovalVersion.allowDiscount as boolean;
        existingRecord.contractSales = forApprovalVersion.contractSales as boolean;
        existingRecord.defaultDiscount = forApprovalVersion.defaultDiscount as number;
        existingRecord.defaultTax = forApprovalVersion.defaultTax as number;
        existingRecord.incomeGenerating = forApprovalVersion.incomeGenerating as boolean;
        existingRecord.taxable = forApprovalVersion.taxable as boolean;
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Sales type approved successfully: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a sales type
     */
    private async approveDeletion(existingRecord: SalesTypeDto): Promise<ResponseDto<SalesTypeDto>> {
        await this.salesTypeDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Sales type deletion approved: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(existingRecord, HTTP_STATUS_OK);
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

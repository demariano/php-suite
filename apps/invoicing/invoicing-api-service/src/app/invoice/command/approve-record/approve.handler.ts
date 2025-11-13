import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, InvoiceDetailsDto, InvoiceDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveInvoiceCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveInvoiceCommand)
export class ApproveInvoiceHandler implements ICommandHandler<ApproveInvoiceCommand> {
    protected readonly logger = new Logger(ApproveInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for invoice: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateInvoiceExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the invoice record exists
     */
    private async validateInvoiceExists(recordId: string): Promise<InvoiceDto> {
        const existingRecord = await this.invoiceDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Invoice not found: ${recordId}`);
            throw new NotFoundException(`Invoice record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to approve invoice change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: InvoiceDto, user: UserCognito): Promise<ResponseDto<InvoiceDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveInvoice(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve invoice with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves an invoice for approval
     */
    private async approveInvoice(existingRecord: InvoiceDto, user: UserCognito): Promise<ResponseDto<InvoiceDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.docno = forApprovalVersion.docno as string;
        existingRecord.invoiceDate = forApprovalVersion.invoiceDate as string;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        existingRecord.areaId = forApprovalVersion.areaId as string;
        existingRecord.areaName = forApprovalVersion.areaName as string;
        existingRecord.territoryManagerId = forApprovalVersion.territoryManagerId as string;
        existingRecord.territoryManagerName = forApprovalVersion.territoryManagerName as string;
        existingRecord.salesTypeId = forApprovalVersion.salesTypeId as string;
        existingRecord.salesTypeName = forApprovalVersion.salesTypeName as string;
        existingRecord.contractId = forApprovalVersion.contractId as string;
        existingRecord.contractName = forApprovalVersion.contractName as string;
        existingRecord.termsId = forApprovalVersion.termsId as string;
        existingRecord.termsName = forApprovalVersion.termsName as string;
        existingRecord.productPriceTypeId = forApprovalVersion.productPriceTypeId as string;
        existingRecord.productPriceTypeName = forApprovalVersion.productPriceTypeName as string;
        existingRecord.finalAmount = forApprovalVersion.finalAmount as number;
        existingRecord.invoiceAmount = forApprovalVersion.invoiceAmount as number;
        existingRecord.taxAmount = forApprovalVersion.taxAmount as number;
        existingRecord.totalAmountPaid = forApprovalVersion.totalAmountPaid as number;
        existingRecord.invoiceDetails = forApprovalVersion.invoiceDetails as InvoiceDetailsDto[];
        existingRecord.contractSales = forApprovalVersion.contractSales as boolean;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Invoice approved successfully: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of an invoice
     */
    private async approveDeletion(existingRecord: InvoiceDto): Promise<ResponseDto<InvoiceDto>> {
        await this.invoiceDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Invoice deletion approved: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(existingRecord, HTTP_STATUS_OK);
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

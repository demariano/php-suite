import { ErrorResponseDto, InvoiceDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateInvoiceCommand } from './create.command';

// Constants

const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateInvoiceCommand)
export class CreateInvoiceHandler implements ICommandHandler<CreateInvoiceCommand> {
    protected readonly logger = new Logger(CreateInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(command: CreateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for invoice: ${command.invoiceDto.docno}`);

        try {
            // Validate that invoice docno doesn't already exist
            await this.validateInvoiceDocnoUnique(command.invoiceDto.docno);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateInvoiceStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.invoiceDatabaseService.createRecord(command.invoiceDto);

            this.logger.log(`Invoice created successfully: ${createdRecord.invoiceId}`);
            return new ResponseDto<InvoiceDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.invoiceDto.docno);
        }
    }

    /**
     * Validates that the invoice docno is unique
     */
    private async validateInvoiceDocnoUnique(docno: string): Promise<void> {
        const existingRecord = await this.invoiceDatabaseService.findRecordByDocno(docno);

        if (existingRecord) {
            this.logger.warn(`Invoice docno already exists: ${docno}`);
            throw new BadRequestException('Invoice document number already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates invoice status and activity logs based on user permissions
     */
    private updateInvoiceStatus(command: CreateInvoiceCommand, hasApprovalPermission: boolean): void {
        console.log('hasApprovalPermission', hasApprovalPermission);
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.invoiceDto.status = StatusEnum.ACTIVE;
            command.invoiceDto.activityLogs = [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to NEW_RECORD
            command.invoiceDto.status = StatusEnum.NEW_RECORD;
            command.invoiceDto.activityLogs = [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice created by ${command.user.username} for approval`
            );
            command.invoiceDto.forApprovalVersion = {};
            command.invoiceDto.forApprovalVersion.docno = command.invoiceDto.docno;
            command.invoiceDto.forApprovalVersion.invoiceDate = command.invoiceDto.invoiceDate;
            command.invoiceDto.forApprovalVersion.customerId = command.invoiceDto.customerId;
            command.invoiceDto.forApprovalVersion.customerName = command.invoiceDto.customerName;
            command.invoiceDto.forApprovalVersion.areaId = command.invoiceDto.areaId;
            command.invoiceDto.forApprovalVersion.areaName = command.invoiceDto.areaName;
            command.invoiceDto.forApprovalVersion.territoryManagerId = command.invoiceDto.territoryManagerId;
            command.invoiceDto.forApprovalVersion.territoryManagerName = command.invoiceDto.territoryManagerName;
            command.invoiceDto.forApprovalVersion.salesTypeId = command.invoiceDto.salesTypeId;
            command.invoiceDto.forApprovalVersion.salesTypeName = command.invoiceDto.salesTypeName;
            command.invoiceDto.forApprovalVersion.contractId = command.invoiceDto.contractId;
            command.invoiceDto.forApprovalVersion.contractName = command.invoiceDto.contractName;
            command.invoiceDto.forApprovalVersion.termsId = command.invoiceDto.termsId;
            command.invoiceDto.forApprovalVersion.termsName = command.invoiceDto.termsName;
            command.invoiceDto.forApprovalVersion.productPriceTypeId = command.invoiceDto.productPriceTypeId;
            command.invoiceDto.forApprovalVersion.productPriceTypeName = command.invoiceDto.productPriceTypeName;
            command.invoiceDto.forApprovalVersion.finalAmount = command.invoiceDto.finalAmount;
            command.invoiceDto.forApprovalVersion.invoiceAmount = command.invoiceDto.invoiceAmount;
            command.invoiceDto.forApprovalVersion.taxAmount = command.invoiceDto.taxAmount;
            command.invoiceDto.forApprovalVersion.invoiceDetails = command.invoiceDto.invoiceDetails;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, docno: string): never {
        this.logger.error(`Error processing create request for ${docno}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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

import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ErrorResponseDto, InvoiceDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitDraftCommand } from './submit-draft.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(SubmitDraftCommand)
export class SubmitDraftHandler implements ICommandHandler<SubmitDraftCommand> {
    protected readonly logger = new Logger(SubmitDraftHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract
    ) {}

    async execute(command: SubmitDraftCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing submit draft request for invoice: ${command.invoiceId}`);

        try {
            // Fetch the DRAFT invoice
            const draftInvoice = await this.invoiceDatabaseService.findRecordById(command.invoiceId);

            if (!draftInvoice) {
                throw new NotFoundException(`Invoice not found for id ${command.invoiceId}`);
            }

            if (draftInvoice.status !== StatusEnum.DRAFT) {
                throw new BadRequestException(`Invoice ${command.invoiceId} is not a draft`);
            }

            // Validate invoice data
            this.validateInvoiceForSubmission(draftInvoice);

            // Generate final docno
            const finalDocno = await this.generateFinalDocno();
            draftInvoice.docno = finalDocno;

            // Determine final status based on user role and amount
            const finalStatus = await this.determineFinalStatus(command, draftInvoice);
            draftInvoice.status = finalStatus;

            // Update activity logs
            if (!draftInvoice.activityLogs) {
                draftInvoice.activityLogs = [];
            }
            draftInvoice.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Draft invoice #${finalDocno} submitted by ${command.user.username}, status set to ${finalStatus}`
            );
            draftInvoice.activityLogs = reduceArrayContents(draftInvoice.activityLogs, ACTIVITY_LOGS_LIMIT);

            // If status is NEW_RECORD, set up forApprovalVersion
            if (finalStatus === StatusEnum.NEW_RECORD) {
                this.setupForApprovalVersion(draftInvoice);
            }

            // Update the invoice in database
            const updatedInvoice = await this.invoiceDatabaseService.updateRecord(draftInvoice);

            this.logger.log(
                `Draft invoice submitted successfully: ${updatedInvoice.invoiceId} with docno: ${finalDocno}`
            );
            return new ResponseDto<InvoiceDto>(updatedInvoice, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.invoiceId);
        }
    }

    /**
     * Validates that the draft invoice has all required fields for submission
     */
    private validateInvoiceForSubmission(invoice: InvoiceDto): void {
        if (!invoice.customerId) {
            throw new BadRequestException('Customer must be selected before submitting invoice');
        }

        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            throw new BadRequestException('Invoice must have at least one detail item');
        }

        // Check if there's at least one non-free item
        const hasNonFreeItem = invoice.invoiceDetails.some((detail) => detail.qty > 0);
        if (!hasNonFreeItem) {
            throw new BadRequestException('Invoice must have at least one regular (non-free) item');
        }
    }

    /**
     * Generates final docno based on configuration
     */
    private async generateFinalDocno(): Promise<string> {
        const startingInvoiceNumberConfig = await this.configurationDatabaseService.findRecordByName(
            'STARTING_INVOICE_NUMBER'
        );
        const startingInvoiceNumber = startingInvoiceNumberConfig
            ? parseInt(startingInvoiceNumberConfig.configurationValue, 10)
            : 1;

        const invoiceCount = await this.invoiceDatabaseService.getInvoiceCount();
        return (startingInvoiceNumber + invoiceCount).toString();
    }

    /**
     * Determines final status based on user role and invoice amount
     */
    private async determineFinalStatus(command: SubmitDraftCommand, invoice: InvoiceDto): Promise<StatusEnum> {
        const isAdminOrSuperAdmin =
            command.user.roles?.includes(UserRole.SUPER_ADMIN) || command.user.roles?.includes(UserRole.ADMIN);

        if (isAdminOrSuperAdmin) {
            return StatusEnum.ACTIVE;
        }

        // Check invoice amount threshold
        const invoiceAmountNeededForApproval = await this.configurationDatabaseService.findRecordByName(
            'INVOICE_AMOUNT_NEEDED_FOR_APPROVAL'
        );

        if (!invoiceAmountNeededForApproval) {
            throw new BadRequestException('Invoice amount needed for approval not found');
        }

        const threshold = parseFloat(invoiceAmountNeededForApproval.configurationValue);

        if (invoice.invoiceAmount <= threshold) {
            return StatusEnum.ACTIVE;
        }

        return StatusEnum.NEW_RECORD;
    }

    /**
     * Sets up forApprovalVersion object for NEW_RECORD status
     */
    private setupForApprovalVersion(invoice: InvoiceDto): void {
        invoice.forApprovalVersion = {
            docno: invoice.docno,
            invoiceDate: invoice.invoiceDate,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            areaId: invoice.areaId,
            areaName: invoice.areaName,
            territoryManagerId: invoice.territoryManagerId,
            territoryManagerName: invoice.territoryManagerName,
            salesTypeId: invoice.salesTypeId,
            salesTypeName: invoice.salesTypeName,
            contractId: invoice.contractId,
            contractName: invoice.contractName,
            termsId: invoice.termsId,
            termsName: invoice.termsName,
            productPriceTypeId: invoice.productPriceTypeId,
            productPriceTypeName: invoice.productPriceTypeName,
            finalAmount: invoice.finalAmount,
            invoiceAmount: invoice.invoiceAmount,
            taxAmount: invoice.taxAmount,
            totalAmountPaid: invoice.totalAmountPaid || 0,
            invoiceDetails: invoice.invoiceDetails,
            contractSales: invoice.contractSales,
        };
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, invoiceId: string): never {
        this.logger.error(`Error processing submit draft request for ${invoiceId}:`, error);

        if (error instanceof BadRequestException || error instanceof NotFoundException) {
            throw error;
        }

        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new BadRequestException(errorMessage);
    }
}

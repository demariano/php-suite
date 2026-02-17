import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ContractInvoiceEventEnum, ErrorResponseDto, InvoiceDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
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
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService,
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
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

            // Validate contract amount limit if invoice has contract and will be ACTIVE
            if (draftInvoice.contractId && finalStatus === StatusEnum.ACTIVE) {
                await this.validateContractAmountLimit(draftInvoice.contractId, draftInvoice.finalAmount);
            }

            // Validate customer credit limit if not a contract sale and status will be ACTIVE
            if (!draftInvoice.contractSales && draftInvoice.customerId && finalStatus === StatusEnum.ACTIVE) {
                await this.validateCustomerCreditLimit(draftInvoice.customerId, draftInvoice.finalAmount, null);
            }

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

            // Send events if status is ACTIVE (GAP #2 fix)
            if (updatedInvoice.status === StatusEnum.ACTIVE) {
                // Send inventory event to deduct stock
                await this.invoiceStockDeltaService.sendFullDeduction(
                    updatedInvoice.invoiceDetails,
                    updatedInvoice.invoiceId
                );
                this.logger.log(`Inventory event sent for submitted draft invoice: ${updatedInvoice.invoiceId}`);

                // Send contract event if invoice has contract
                if (updatedInvoice.contractId) {
                    await this.sendContractInvoiceEvent(
                        ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                        updatedInvoice.contractId
                    );
                    this.logger.log(
                        `Contract event sent for submitted draft invoice: ${updatedInvoice.invoiceId}, contract: ${updatedInvoice.contractId}`
                    );
                }
            }

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
     * Validates contract amount limit
     */
    private async validateContractAmountLimit(contractId: string, newInvoiceAmount: number): Promise<void> {
        const contract = await this.contractDatabaseService.findRecordById(contractId);

        if (!contract) {
            throw new BadRequestException(`Contract not found: ${contractId}`);
        }

        // Calculate current invoiced amount
        const currentInvoicedAmount = contract.invoicedAmount || 0;

        // Calculate projected amount
        const projectedInvoicedAmount = currentInvoicedAmount + newInvoiceAmount;

        // Check if it exceeds
        if (projectedInvoicedAmount > contract.contractAmount) {
            const remaining = contract.contractAmount - currentInvoicedAmount;
            throw new BadRequestException(
                `Invoice amount (${newInvoiceAmount.toFixed(2)}) exceeds remaining contract balance. ` +
                    `Contract: ${contract.contractAmount.toFixed(2)}, ` +
                    `Already invoiced: ${currentInvoicedAmount.toFixed(2)}, ` +
                    `Remaining: ${remaining.toFixed(2)}`
            );
        }

        this.logger.log(
            `Contract validation passed - Contract: ${contract.contractAmount}, ` +
                `Current: ${currentInvoicedAmount}, New invoice: ${newInvoiceAmount}, ` +
                `Projected: ${projectedInvoicedAmount}`
        );
    }

    /**
     * Sends contract invoice event to recalculate invoiced amount
     */
    private async sendContractInvoiceEvent(event: ContractInvoiceEventEnum, contractId: string): Promise<void> {
        try {
            this.logger.log(`Sending contract invoice event ${event} for contract ${contractId}`);
            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(
                invoiceEventSQSUrl,
                JSON.stringify({
                    event,
                    data: contractId,
                })
            );
        } catch (error) {
            this.logger.error(`Failed to send contract invoice event ${event} for contract ${contractId}:`, error);
        }
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

    /**
     * Validates that adding this invoice won't exceed the customer's credit limit
     */
    private async validateCustomerCreditLimit(
        customerId: string,
        invoiceAmount: number,
        existingInvoiceAmount: number | null
    ): Promise<void> {
        const customer = await this.customerDatabaseService.findRecordById(customerId);

        if (!customer || !customer.creditLimit) {
            return; // No credit limit set, skip validation
        }

        const currentBalance = customer.balance || 0;
        let projectedBalance = currentBalance + invoiceAmount;

        if (existingInvoiceAmount !== null) {
            projectedBalance -= existingInvoiceAmount;
        }

        if (projectedBalance > customer.creditLimit) {
            throw new BadRequestException(
                `Invoice would exceed customer credit limit. ` +
                    `Credit limit: ${customer.creditLimit.toFixed(2)}, ` +
                    `Current balance: ${currentBalance.toFixed(2)}, ` +
                    `Invoice amount: ${invoiceAmount.toFixed(2)}, ` +
                    `Projected balance: ${projectedBalance.toFixed(2)}`
            );
        }

        this.logger.log(
            `Customer credit limit validation passed - Limit: ${customer.creditLimit}, ` +
                `Current balance: ${currentBalance}, Invoice: ${invoiceAmount}, ` +
                `Projected: ${projectedBalance}`
        );
    }
}

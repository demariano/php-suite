import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import {
    ContractInvoiceEventEnum,
    CreateInvoiceDto,
    ErrorResponseDto,
    InvoiceDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ulid } from 'ulid';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
import { CreateInvoiceCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateInvoiceCommand)
export class CreateInvoiceHandler implements ICommandHandler<CreateInvoiceCommand> {
    protected readonly logger = new Logger(CreateInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(command: CreateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        try {
            // Recompute totals from invoice details to ensure consistency
            this.recomputeInvoiceTotals(command.invoiceDto);

            // Check if creating a DRAFT invoice
            if (command.invoiceDto.status === StatusEnum.DRAFT) {
                // Generate DRAFT docno with ulid
                command.invoiceDto.docno = `DRAFT-${ulid()}`;
                this.logger.log(`Processing create request for DRAFT invoice with docno: ${command.invoiceDto.docno}`);

                // Set initial values for DRAFT
                command.invoiceDto.totalAmountPaid = 0;
                command.invoiceDto.activityLogs = [];
                command.invoiceDto.activityLogs.push(
                    `Date: ${new Date().toLocaleString('en-US', {
                        timeZone: 'Asia/Manila',
                    })}, Draft invoice created by ${command.user.username}`
                );
                command.invoiceDto.activityLogs = reduceArrayContents(
                    command.invoiceDto.activityLogs,
                    ACTIVITY_LOGS_LIMIT
                );

                // Create DRAFT record in database
                const createdRecord = await this.invoiceDatabaseService.createRecord(command.invoiceDto);
                this.logger.log(`Draft invoice created successfully: ${createdRecord.invoiceId}`);
                return new ResponseDto<InvoiceDto>(createdRecord, HTTP_STATUS_CREATED);
            }

            // Get STARTING_INVOICE_NUMBER from configuration
            const startingInvoiceNumberConfig = await this.configurationDatabaseService.findRecordByName(
                'STARTING_INVOICE_NUMBER'
            );
            const startingInvoiceNumber = startingInvoiceNumberConfig
                ? parseInt(startingInvoiceNumberConfig.configurationValue, 10)
                : 1; // Default to 1 if not found

            // Get total invoice count
            const invoiceCount = await this.invoiceDatabaseService.getInvoiceCount();

            // Calculate new docno: STARTING_INVOICE_NUMBER + invoiceCount
            const newDocno = (startingInvoiceNumber + invoiceCount).toString();
            command.invoiceDto.docno = newDocno;

            this.logger.log(`Processing create request for invoice with auto-generated docno: ${newDocno}`);

            // Check if user is admin or super admin
            const isAdminOrSuperAdmin =
                command.user.roles?.includes(UserRole.SUPER_ADMIN) || command.user.roles?.includes(UserRole.ADMIN);

            // If admin/super admin, bypass approval check and set to ACTIVE
            if (isAdminOrSuperAdmin) {
                this.updateInvoiceStatusForAdmin(command);
            } else {
                // For non-admin users, check invoice amount for approval
                const invoiceAmountNeededForApproval = await this.configurationDatabaseService.findRecordByName(
                    'INVOICE_AMOUNT_NEEDED_FOR_APPROVAL'
                );

                if (!invoiceAmountNeededForApproval) {
                    throw new BadRequestException('Invoice amount needed for approval not found');
                }

                const invoiceAmountNeededForApprovalValue = parseFloat(
                    invoiceAmountNeededForApproval.configurationValue
                );

                // Update status and activity logs based on permissions
                this.updateInvoiceStatus(command, invoiceAmountNeededForApprovalValue);
            }

            // Validate contract amount limit if invoice is for a contract
            // (DRAFT invoices are handled above and return early, so this is always non-DRAFT)
            if (command.invoiceDto.contractId) {
                await this.validateContractAmountLimit(
                    command.invoiceDto.contractId,
                    command.invoiceDto.finalAmount,
                    null // No existing invoice to subtract
                );
            }

            // Create record in database
            const createdRecord = await this.invoiceDatabaseService.createRecord(command.invoiceDto);

            // Send inventory event to deduct stock if invoice is ACTIVE
            if (createdRecord.status === StatusEnum.ACTIVE) {
                await this.invoiceStockDeltaService.sendFullDeduction(
                    createdRecord.invoiceDetails,
                    createdRecord.invoiceId
                );

                // If invoice has a contractId, trigger recalculation of contract invoiced amount
                if (createdRecord.contractId) {
                    await this.sendContractInvoiceEvent(
                        ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                        createdRecord.contractId
                    );
                }

                const invoicePaymentDto: InvoicePaymentEventDto = {
                    invoiceId: createdRecord.invoiceId,
                    customerId: createdRecord.customerId,
                    invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_CREATED,
                };
                const invoicePayloads: InvoicePaymentEventDto[] = [];

                invoicePayloads.push(invoicePaymentDto);
                await this.sendInvoicePaymentEvent(invoicePayloads);
            }

            this.logger.log(
                `Invoice created successfully: ${createdRecord.invoiceId} with docno: ${createdRecord.docno}`
            );
            return new ResponseDto<InvoiceDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.invoiceDto.docno || 'unknown');
        }
    }

    /**
     * Updates invoice status for admin/super admin users - always set to ACTIVE
     */
    private updateInvoiceStatusForAdmin(command: CreateInvoiceCommand): void {
        command.invoiceDto.status = StatusEnum.ACTIVE;
        command.invoiceDto.totalAmountPaid = 0;
        command.invoiceDto.activityLogs = [];
        command.invoiceDto.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );
        // Limit activity logs to last 10 entries
        command.invoiceDto.activityLogs = reduceArrayContents(command.invoiceDto.activityLogs, ACTIVITY_LOGS_LIMIT);
    }

    /**
     * Updates invoice status and activity logs based on user permissions
     */
    private updateInvoiceStatus(command: CreateInvoiceCommand, invoiceAmountNeededForApprovalValue: number): void {
        //get the invoice amount needed for approval from the configuration database

        if (command.invoiceDto.invoiceAmount <= invoiceAmountNeededForApprovalValue) {
            // User can approve directly - set to ACTIVE
            command.invoiceDto.status = StatusEnum.ACTIVE;
            command.invoiceDto.totalAmountPaid = 0;
            command.invoiceDto.activityLogs = [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            // Limit activity logs to last 10 entries
            command.invoiceDto.activityLogs = reduceArrayContents(command.invoiceDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.invoiceDto.status = StatusEnum.NEW_RECORD;
            command.invoiceDto.activityLogs = [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice created by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.invoiceDto.activityLogs = reduceArrayContents(command.invoiceDto.activityLogs, ACTIVITY_LOGS_LIMIT);
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
            command.invoiceDto.forApprovalVersion.totalAmountPaid = 0;
            command.invoiceDto.forApprovalVersion.invoiceDetails = command.invoiceDto.invoiceDetails;
            command.invoiceDto.forApprovalVersion.contractSales = command.invoiceDto.contractSales;
            command.invoiceDto.forApprovalVersion.taxRate = command.invoiceDto.taxRate;
            command.invoiceDto.forApprovalVersion.taxable = command.invoiceDto.taxable;
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
     * Recomputes invoiceAmount, taxAmount, and finalAmount from invoiceDetails
     * to ensure the stored totals are always consistent with line items
     */
    private recomputeInvoiceTotals(invoice: CreateInvoiceDto): void {
        const details = invoice.invoiceDetails || [];
        if (details.length === 0) return;

        const invoiceAmount = Math.round(details.reduce((sum, d) => sum + (d.amount || 0), 0) * 100) / 100;
        const effectiveTaxRate = invoice.taxable ? (invoice.taxRate ?? 0) / 100 : 0;
        const taxAmount = Math.round(invoiceAmount * effectiveTaxRate * 100) / 100;
        const finalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100;

        invoice.invoiceAmount = invoiceAmount;
        invoice.taxAmount = taxAmount;
        invoice.finalAmount = finalAmount;
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
     * Validates that adding this invoice won't exceed the contract amount limit
     */
    private async validateContractAmountLimit(
        contractId: string,
        newInvoiceAmount: number,
        existingInvoiceAmount: number | null
    ): Promise<void> {
        // Fetch the contract
        const contract = await this.contractDatabaseService.findRecordById(contractId);

        if (!contract) {
            throw new BadRequestException(`Contract not found: ${contractId}`);
        }

        // Calculate current invoiced amount (excluding this invoice if it's an update)
        let currentInvoicedAmount = contract.invoicedAmount || 0;

        // If this is an update, subtract the old invoice amount first
        if (existingInvoiceAmount !== null) {
            currentInvoicedAmount -= existingInvoiceAmount;
        }

        // Calculate what the new total would be
        const projectedInvoicedAmount = currentInvoicedAmount + newInvoiceAmount;

        // Check if it would exceed the contract amount
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

    private async sendInvoicePaymentEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.CUSTOMER_BALANCE_UPDATE, // Using CUSTOMER_BALANCE_UPDATE as a generic event type for invoice payment changes
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }
}

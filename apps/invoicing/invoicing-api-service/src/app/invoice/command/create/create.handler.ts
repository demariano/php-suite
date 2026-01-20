import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import {
    ErrorResponseDto,
    InventoryEventDto,
    InventoryEventEnum,
    InvoiceDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ulid } from 'ulid';
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
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: CreateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        try {
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

            // Create record in database
            const createdRecord = await this.invoiceDatabaseService.createRecord(command.invoiceDto);

            // Send inventory event to deduct stock if invoice is ACTIVE
            if (createdRecord.status === StatusEnum.ACTIVE) {
                await this.sendInventoryApprovedEvent(createdRecord);
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

    /**
     * Sends INVOICE_APPROVED event to deduct stock quantities
     */
    private async sendInventoryApprovedEvent(invoice: InvoiceDto): Promise<void> {
        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            return;
        }

        const stockItems = invoice.invoiceDetails.map((detail) => ({
            stockId: detail.stockId as string,
            qty: detail.qty as number,
        }));

        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.INVOICE_APPROVED,
            stockItems: stockItems,
        };

        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
        this.logger.log(`INVOICE_APPROVED event sent for invoice: ${invoice.invoiceId}`);
    }
}

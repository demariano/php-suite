import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ResponseDto, StatusEnum, ValidateInvoiceResponseDto, ValidationErrors, ValidationType } from '@dto';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateInvoiceCommand } from './validate-invoice.command';

const HTTP_STATUS_OK = 200;

@CommandHandler(ValidateInvoiceCommand)
export class ValidateInvoiceHandler implements ICommandHandler<ValidateInvoiceCommand> {
    protected readonly logger = new Logger(ValidateInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract
    ) {}

    async execute(command: ValidateInvoiceCommand): Promise<ResponseDto<ValidateInvoiceResponseDto>> {
        this.logger.log(`Processing validation request for invoice`);

        const { invoice, validationType, existingInvoiceId } = command.request;
        const errors: ValidationErrors = {};
        let isValid = true;

        try {
            // 1. Validate required fields
            const missingFields = this.validateRequiredFields(invoice, validationType);
            if (missingFields.length > 0) {
                errors.missingFields = missingFields;
                isValid = false;
            }

            // 2. Validate contract amount limit (if invoice has contract)
            if (invoice.contractId && invoice.status !== StatusEnum.DRAFT) {
                const contractError = await this.validateContractAmountLimit(
                    invoice.contractId,
                    invoice.finalAmount,
                    existingInvoiceId
                );
                if (contractError) {
                    errors.contractAmountExceeded = contractError;
                    isValid = false;
                }
            }

            // 3. Validate configuration requirements
            const configError = await this.validateConfiguration();
            if (configError) {
                errors.configurationError = configError;
                isValid = false;
            }

            const response: ValidateInvoiceResponseDto = {
                valid: isValid,
                ...(Object.keys(errors).length > 0 && { errors }),
            };

            this.logger.log(`Validation completed: ${isValid ? 'PASSED' : 'FAILED'}`);
            return new ResponseDto<ValidateInvoiceResponseDto>(response, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Validation error:`, error);
            const response: ValidateInvoiceResponseDto = {
                valid: false,
                errors: {
                    general: error instanceof Error ? error.message : 'Validation failed',
                },
            };
            return new ResponseDto<ValidateInvoiceResponseDto>(response, HTTP_STATUS_OK);
        }
    }

    /**
     * Validates required fields based on validation type
     */
    private validateRequiredFields(invoice: any, validationType: ValidationType): string[] {
        const missing: string[] = [];

        // Common validations for all types except DRAFT
        if (validationType === ValidationType.SUBMIT_DRAFT) {
            if (!invoice.customerId) {
                missing.push('Customer must be selected');
            }

            if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
                missing.push('Invoice must have at least one detail item');
            } else {
                const hasNonFreeItem = invoice.invoiceDetails.some((detail: any) => detail.qty > 0);
                if (!hasNonFreeItem) {
                    missing.push('Invoice must have at least one regular (non-free) item');
                }
            }
        }

        return missing;
    }

    /**
     * Validates contract amount limit
     */
    private async validateContractAmountLimit(
        contractId: string,
        newInvoiceAmount: number,
        existingInvoiceId?: string
    ): Promise<{
        contractAmount: number;
        alreadyInvoiced: number;
        newAmount: number;
        remaining: number;
        message: string;
    } | null> {
        try {
            const contract = await this.contractDatabaseService.findRecordById(contractId);

            if (!contract) {
                return {
                    contractAmount: 0,
                    alreadyInvoiced: 0,
                    newAmount: newInvoiceAmount,
                    remaining: 0,
                    message: `Contract not found: ${contractId}`,
                };
            }

            // Calculate current invoiced amount
            let currentInvoicedAmount = contract.invoicedAmount || 0;

            // If this is an update, we need to subtract the old invoice amount
            if (existingInvoiceId) {
                const existingInvoice = await this.invoiceDatabaseService.findRecordById(existingInvoiceId);
                if (existingInvoice && existingInvoice.status === StatusEnum.ACTIVE) {
                    currentInvoicedAmount -= existingInvoice.finalAmount || 0;
                }
            }

            // Calculate projected amount
            const projectedInvoicedAmount = currentInvoicedAmount + newInvoiceAmount;

            // Check if it exceeds
            if (projectedInvoicedAmount > contract.contractAmount) {
                const remaining = contract.contractAmount - currentInvoicedAmount;
                return {
                    contractAmount: contract.contractAmount,
                    alreadyInvoiced: currentInvoicedAmount,
                    newAmount: newInvoiceAmount,
                    remaining: remaining,
                    message: `Invoice amount (${newInvoiceAmount.toFixed(
                        2
                    )}) exceeds remaining contract balance. Contract: ${contract.contractAmount.toFixed(
                        2
                    )}, Already invoiced: ${currentInvoicedAmount.toFixed(2)}, Remaining: ${remaining.toFixed(2)}`,
                };
            }

            return null; // Validation passed
        } catch (error) {
            this.logger.error('Error validating contract amount:', error);
            return {
                contractAmount: 0,
                alreadyInvoiced: 0,
                newAmount: newInvoiceAmount,
                remaining: 0,
                message: 'Failed to validate contract amount',
            };
        }
    }

    /**
     * Validates required configuration
     */
    private async validateConfiguration(): Promise<string | null> {
        try {
            const invoiceAmountConfig = await this.configurationDatabaseService.findRecordByName(
                'INVOICE_AMOUNT_NEEDED_FOR_APPROVAL'
            );

            if (!invoiceAmountConfig) {
                return 'Invoice amount needed for approval configuration not found';
            }

            const startingInvoiceConfig = await this.configurationDatabaseService.findRecordByName(
                'STARTING_INVOICE_NUMBER'
            );

            if (!startingInvoiceConfig) {
                return 'Starting invoice number configuration not found';
            }

            return null; // All configs present
        } catch (error) {
            this.logger.error('Error validating configuration:', error);
            return 'Failed to validate configuration';
        }
    }
}

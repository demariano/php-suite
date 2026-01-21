import { ContractInvoiceEventEnum, InvoiceDto, StatusEnum } from '@dto';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContractInvoiceHandlerService {
    protected readonly logger = new Logger(ContractInvoiceHandlerService.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,

        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async handleContractInvoiceEvent(eventType: ContractInvoiceEventEnum, contractId: string): Promise<void> {
        this.logger.log(`Handling contract invoice event: ${eventType} for contract ${contractId}`);

        try {
            switch (eventType) {
                case ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT:
                    await this.recalculateInvoicedAmount(contractId);
                    break;
                default:
                    this.logger.warn(`Unknown contract invoice event type: ${eventType}`);
            }
        } catch (error) {
            this.logger.error(`Error handling contract invoice event ${eventType} for contract ${contractId}:`, error);
            throw error;
        }
    }

    private async recalculateInvoicedAmount(contractId: string): Promise<void> {
        this.logger.log(`Recalculating invoiced amount for contract ${contractId}`);

        // Fetch all invoices for this contract
        const invoices = await this.invoiceDatabaseService.findRecordsByContractId(contractId);

        // Calculate total from ACTIVE invoices only
        const invoicedAmount = (invoices || [])
            .filter((invoice: InvoiceDto) => invoice.status === StatusEnum.ACTIVE)
            .reduce((sum: number, invoice: InvoiceDto) => sum + (invoice.finalAmount || 0), 0);

        this.logger.log(`Calculated invoiced amount for contract ${contractId}: ${invoicedAmount}`);

        // Update the contract
        await this.contractDatabaseService.updateInvoicedAmount(contractId, invoicedAmount);

        this.logger.log(`Successfully updated invoiced amount for contract ${contractId}`);
    }
}

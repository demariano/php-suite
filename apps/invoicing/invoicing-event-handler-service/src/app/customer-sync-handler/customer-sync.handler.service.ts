import {
    ContractDatabaseService,
    InvoiceDatabaseService,
    PaymentDatabaseService,
    ReturnGoodSoldDatabaseService,
} from '@invoicing-database-service';
import { Inject, Injectable, Logger } from '@nestjs/common';

export interface CustomerUpdatedEvent {
    customerId: string;
    newCustomerName: string;
}

@Injectable()
export class CustomerSyncHandlerService {
    private readonly logger = new Logger(CustomerSyncHandlerService.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseService,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseService,
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseService,
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseService
    ) {}

    /**
     * Main handler - processes customer name sync for all entities
     */
    async handleCustomerUpdatedEvent(event: CustomerUpdatedEvent): Promise<void> {
        this.logger.log(
            `Received CustomerUpdatedEvent: customerId=${event.customerId}, newName=${event.newCustomerName}`
        );

        const startTime = Date.now();

        try {
            // Process all entities in parallel
            const results = await Promise.allSettled([
                this.syncCustomerNameToInvoices(event),
                this.syncCustomerNameToContracts(event),
                this.syncCustomerNameToPayments(event),
                this.syncCustomerNameToReturnGoodSold(event),
            ]);

            // Log results
            const entityNames = ['Invoices', 'Contracts', 'Payments', 'ReturnGoodSold'];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    this.logger.log(`✅ ${entityNames[index]} sync completed`);
                } else {
                    this.logger.error(`❌ ${entityNames[index]} sync failed:`, result.reason);
                }
            });

            // Check if any failed
            const failures = results.filter((r) => r.status === 'rejected');
            if (failures.length > 0) {
                throw new Error(`Failed to sync ${failures.length} entity types`);
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Customer sync completed successfully in ${duration}ms for customerId: ${event.customerId}`
            );
        } catch (error) {
            this.logger.error(`❌ Customer sync failed for customerId: ${event.customerId}`, error);
            throw error;
        }
    }

    /**
     * Sync customer name changes to all invoices
     */
    private async syncCustomerNameToInvoices(event: CustomerUpdatedEvent): Promise<void> {
        const { customerId, newCustomerName } = event;
        const limit = 100; // Fetch 100 records per page
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null; // Start with null for first page
        let totalUpdated = 0;
        let pageNumber = 0;

        this.logger.log(`Starting customer sync for invoices: customerId=${customerId}`);

        try {
            do {
                pageNumber++;

                // For first page, don't pass direction. For subsequent pages, use 'next'
                const direction = cursorPointer ? 'next' : null;

                // Fetch page using existing pagination pattern
                const page = await this.invoiceDatabaseService.findRecordsByCustomerIdPagination(
                    limit,
                    customerId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) {
                    this.logger.log('No more invoices to process');
                    break;
                }

                this.logger.log(`Processing page ${pageNumber}: ${page.data.length} invoices`);

                // Update each invoice with new customer name
                const updatedInvoices = page.data.map((invoice) => ({
                    ...invoice,
                    customerName: newCustomerName,
                    // Update forApprovalVersion if it exists
                    forApprovalVersion: invoice.forApprovalVersion
                        ? {
                              ...invoice.forApprovalVersion,
                              customerName: newCustomerName,
                          }
                        : undefined,
                }));

                // Batch update (25 at a time internally)
                await this.invoiceDatabaseService.batchUpdateRecords(updatedInvoices);

                totalUpdated += page.data.length;

                // Get next cursor from PageDto
                cursorPointer = page.nextCursorPointer || null;

                // Small delay to avoid throttling
                if (cursorPointer) {
                    await this.sleep(50); // 50ms delay between pages
                }
            } while (cursorPointer); // Continue while there's a next cursor

            this.logger.log(`✅ Successfully synced ${totalUpdated} invoices for customerId: ${customerId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync invoices for customerId: ${customerId}`, error);
            throw error;
        }
    }

    /**
     * Sync customer name to contracts
     */
    private async syncCustomerNameToContracts(event: CustomerUpdatedEvent): Promise<void> {
        const { customerId, newCustomerName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting customer sync for contracts: customerId=${customerId}`);

        try {
            do {
                // For first page, don't pass direction. For subsequent pages, use 'next'
                const direction = cursorPointer ? 'next' : null;

                const page = await this.contractDatabaseService.findRecordsByCustomerIdPagination(
                    limit,
                    customerId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedContracts = page.data.map((contract) => ({
                    ...contract,
                    customerName: newCustomerName,
                    forApprovalVersion: contract.forApprovalVersion
                        ? {
                              ...contract.forApprovalVersion,
                              customerName: newCustomerName,
                          }
                        : undefined,
                }));

                await this.contractDatabaseService.batchUpdateRecords(updatedContracts);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} contracts for customerId: ${customerId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync contracts for customerId: ${customerId}`, error);
            throw error;
        }
    }

    /**
     * Sync customer name to payments
     */
    private async syncCustomerNameToPayments(event: CustomerUpdatedEvent): Promise<void> {
        const { customerId, newCustomerName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting customer sync for payments: customerId=${customerId}`);

        try {
            do {
                // For first page, don't pass direction. For subsequent pages, use 'next'
                const direction = cursorPointer ? 'next' : null;

                const page = await this.paymentDatabaseService.findRecordsByCustomerIdPagination(
                    limit,
                    customerId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedPayments = page.data.map((payment) => ({
                    ...payment,
                    customerName: newCustomerName,
                    forApprovalVersion: payment.forApprovalVersion
                        ? {
                              ...payment.forApprovalVersion,
                              customerName: newCustomerName,
                          }
                        : undefined,
                }));

                await this.paymentDatabaseService.batchUpdateRecords(updatedPayments);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(`✅ Successfully synced ${totalUpdated} payments for customerId: ${customerId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to sync payments for customerId: ${customerId}`, error);
            throw error;
        }
    }

    /**
     * Sync customer name to return good sold records
     */
    private async syncCustomerNameToReturnGoodSold(event: CustomerUpdatedEvent): Promise<void> {
        const { customerId, newCustomerName } = event;
        const limit = 100;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursorPointer: any = null;
        let totalUpdated = 0;

        this.logger.log(`Starting customer sync for return good sold: customerId=${customerId}`);

        try {
            do {
                // For first page, don't pass direction. For subsequent pages, use 'next'
                const direction = cursorPointer ? 'next' : null;

                const page = await this.returnGoodSoldDatabaseService.findRecordsByCustomerIdPagination(
                    limit,
                    customerId,
                    direction,
                    cursorPointer
                );

                if (!page.data || page.data.length === 0) break;

                const updatedReturnGoodSold = page.data.map((rgs) => ({
                    ...rgs,
                    customerName: newCustomerName,
                    forApprovalVersion: rgs.forApprovalVersion
                        ? {
                              ...rgs.forApprovalVersion,
                              customerName: newCustomerName,
                          }
                        : undefined,
                }));

                await this.returnGoodSoldDatabaseService.batchUpdateRecords(updatedReturnGoodSold);
                totalUpdated += page.data.length;
                cursorPointer = page.nextCursorPointer || null;

                if (cursorPointer) await this.sleep(50);
            } while (cursorPointer);

            this.logger.log(
                `✅ Successfully synced ${totalUpdated} return good sold records for customerId: ${customerId}`
            );
        } catch (error) {
            this.logger.error(`❌ Failed to sync return good sold for customerId: ${customerId}`, error);
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

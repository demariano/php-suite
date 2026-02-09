import { CustomerDatabaseService } from '@customer-database-service';
import { CustomerBalanceEventDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerBalanceHandlerService {
    private readonly logger = new Logger(CustomerBalanceHandlerService.name);

    constructor(private readonly customerDatabaseService: CustomerDatabaseService) {}

    /**
     * Main handler - processes customer balance update events
     */
    async handleBalanceEvent(event: CustomerBalanceEventDto): Promise<void> {
        try {
            const customerRecord = await this.customerDatabaseService.findRecordById(event.customerId);
            if (!customerRecord) {
                this.logger.warn(`Customer not found for ID: ${event.customerId}`);
                return;
            }
            customerRecord.balance = event.balance ?? customerRecord.balance;
            if (event.creditUsed !== undefined) {
                const currentCredit = customerRecord.customerCredit ?? 0;
                customerRecord.customerCredit = currentCredit + event.creditUsed;
            } else if (event.creditAmount !== undefined) {
                customerRecord.customerCredit = event.creditAmount;
            }

            await this.customerDatabaseService.updateRecord(customerRecord);
        } catch (error) {
            this.logger.error(
                `❌ Customer balance update failed: customerId=${event.customerId}, eventType=${event.eventType}`,
                error
            );
            throw error;
        }
    }
}

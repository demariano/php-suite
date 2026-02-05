import { CustomerDatabaseService } from '@customer-database-service';
import { CustomerBalanceEventDto, CustomerBalanceEventEnum } from '@dto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomerBalanceHandlerService {
    private readonly logger = new Logger(CustomerBalanceHandlerService.name);

    constructor(private readonly customerDatabaseService: CustomerDatabaseService) {}

    /**
     * Main handler - processes customer balance update events
     */
    async handleBalanceEvent(event: CustomerBalanceEventDto): Promise<void> {
        this.logger.log(
            `Received CustomerBalanceEvent: eventType=${event.eventType}, customerId=${event.customerId}, amount=${event.amount}, referenceId=${event.referenceId}`
        );

        const startTime = Date.now();

        try {
            // Handle OVERPAYMENT_CREDIT separately - it updates customerCredit, not balance
            if (event.eventType === CustomerBalanceEventEnum.OVERPAYMENT_CREDIT) {
                await this.handleOverpaymentCredit(event);
                return;
            }

            const amountChange = this.calculateAmountChange(event.eventType, event.amount);

            const updatedCustomer = await this.customerDatabaseService.updateBalance(event.customerId, amountChange);

            if (!updatedCustomer) {
                this.logger.warn(`⚠️ Customer not found for balance update: customerId=${event.customerId}`);
                return;
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ Customer balance updated successfully in ${duration}ms: customerId=${event.customerId}, newBalance=${updatedCustomer.balance}, eventType=${event.eventType}, referenceNo=${event.referenceNo}`
            );
        } catch (error) {
            this.logger.error(
                `❌ Customer balance update failed: customerId=${event.customerId}, eventType=${event.eventType}`,
                error
            );
            throw error;
        }
    }

    /**
     * Handle overpayment credit - adds credit amount to customerCredit field AND adjusts balance
     * This occurs when an invoice amount is reduced below the total payments already made
     *
     * When overpayment occurs:
     * 1. The invoice reduction causes a negative balance (via INVOICE_DELETED delta event)
     * 2. This handler adds the overpayment to customerCredit
     * 3. This handler also adjusts balance to offset the negative (brings it back to 0 or positive)
     */
    private async handleOverpaymentCredit(event: CustomerBalanceEventDto): Promise<void> {
        const creditAmount = event.creditAmount || 0;
        const balanceAdjustment = event.amount || 0;

        if (creditAmount <= 0) {
            this.logger.warn(
                `⚠️ Invalid credit amount for OVERPAYMENT_CREDIT: customerId=${event.customerId}, creditAmount=${creditAmount}`
            );
            return;
        }

        this.logger.log(
            `Processing OVERPAYMENT_CREDIT: customerId=${event.customerId}, creditAmount=${creditAmount}, balanceAdjustment=${balanceAdjustment}, referenceNo=${event.referenceNo}`
        );

        // Step 1: Add to customerCredit
        const creditUpdatedCustomer = await this.customerDatabaseService.updateCustomerCredit(
            event.customerId,
            creditAmount
        );

        if (!creditUpdatedCustomer) {
            this.logger.warn(`⚠️ Customer not found for credit update: customerId=${event.customerId}`);
            return;
        }

        this.logger.log(
            `✅ Customer credit updated: customerId=${event.customerId}, newCredit=${creditUpdatedCustomer.customerCredit}`
        );

        // Step 2: Adjust balance to offset the negative balance from invoice reduction
        // This brings the balance back to 0 (or positive if there was remaining balance)
        if (balanceAdjustment > 0) {
            const balanceUpdatedCustomer = await this.customerDatabaseService.updateBalance(
                event.customerId,
                balanceAdjustment // Add to balance (offsets the negative from invoice reduction)
            );

            if (balanceUpdatedCustomer) {
                this.logger.log(
                    `✅ Customer balance adjusted: customerId=${event.customerId}, newBalance=${balanceUpdatedCustomer.balance}, adjustment=+${balanceAdjustment}`
                );
            }
        }

        this.logger.log(
            `✅ OVERPAYMENT_CREDIT processed successfully: customerId=${event.customerId}, creditAdded=${creditAmount}, balanceAdjusted=+${balanceAdjustment}, referenceNo=${event.referenceNo}`
        );
    }

    /**
     * Calculate the amount change based on event type
     *
     * Business Rules:
     * - INVOICE_CREATED: ADD to balance (customer owes more)
     * - INVOICE_DELETED: DEDUCT from balance (customer owes less)
     * - PAYMENT_CREATED: DEDUCT from balance (customer paid)
     * - PAYMENT_DELETED: ADD to balance (payment reversed)
     */
    private calculateAmountChange(eventType: CustomerBalanceEventEnum, amount: number): number {
        switch (eventType) {
            case CustomerBalanceEventEnum.INVOICE_CREATED:
                // Invoice created → customer owes more → ADD to balance
                return amount;

            case CustomerBalanceEventEnum.INVOICE_DELETED:
                // Invoice deleted → customer owes less → DEDUCT from balance
                return -amount;

            case CustomerBalanceEventEnum.PAYMENT_CREATED:
                // Payment made → customer paid → DEDUCT from balance
                return -amount;

            case CustomerBalanceEventEnum.PAYMENT_DELETED:
                // Payment deleted → payment reversed → ADD to balance
                return amount;

            default:
                this.logger.warn(`Unknown event type: ${eventType}`);
                return 0;
        }
    }
}

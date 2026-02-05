import { CustomerBalanceEventEnum } from '../../enums/customer.balance.event.enum';

export class CustomerBalanceEventDto {
    eventType!: CustomerBalanceEventEnum;
    customerId!: string;
    customerName?: string;
    amount!: number;
    referenceId!: string; // invoiceId or paymentId
    referenceNo?: string; // docNo or receiptNo
    creditAmount?: number; // For OVERPAYMENT_CREDIT events - amount to add to customerCredit
}

import { CustomerBalanceEventEnum } from '../../enums/customer.balance.event.enum';

export class CustomerBalanceEventDto {
    eventType!: CustomerBalanceEventEnum;
    customerId!: string;
    balance?: number;
    creditAmount?: number;
    creditUsed?: number;
}

import { CustomerEventEnum } from '../../enums/customer.event.enum';

export interface CustomerEventDto {
    eventType: CustomerEventEnum;
    customerId: string;
    newCustomerName: string;
    timestamp?: string;
}

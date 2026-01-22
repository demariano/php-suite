import { CustomerTypeEventEnum } from '../enums/customer-type.event.enum';

export interface CustomerTypeEventDto {
    eventType: CustomerTypeEventEnum;
    customerTypeId: string;
    newCustomerTypeName: string;
    timestamp: string;
}

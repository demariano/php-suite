import { CustomerClassificationEventEnum } from '../enums/customer-classification.event.enum';

export interface CustomerClassificationEventDto {
    eventType: CustomerClassificationEventEnum;
    customerClassificationId: string;
    newCustomerClassificationName: string;
    timestamp: string;
}

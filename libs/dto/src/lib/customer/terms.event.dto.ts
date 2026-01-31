import { TermsEventEnum } from '../enums/terms.event.enum';

export interface TermsEventDto {
    termsId: string;
    newTermsName: string;
    eventType: TermsEventEnum;
    timestamp: string;
}

export interface TermsUpdatedEvent {
    termsId: string;
    newTermsName: string;
}

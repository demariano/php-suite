import { AccountEventEnum } from '../../enums/account.event.enum';

export interface AccountEventDto {
    eventType: AccountEventEnum;
    accountingId: string;
    newAccountName: string;
    timestamp: string;
}

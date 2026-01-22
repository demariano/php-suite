import { Injectable, Logger } from '@nestjs/common';
import { AccountEventEnum, AreaEventEnum, CustomerEventEnum } from '@php/dto';
import { AccountSyncHandlerService } from './account-sync-handler/account-sync.handler.service';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync.handler.service';
import { CustomerSyncHandlerService } from './customer-sync-handler/';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly accountSyncHandler: AccountSyncHandlerService,
        private readonly customerSyncHandler: CustomerSyncHandlerService,
        private readonly areaSyncHandler: AreaSyncHandlerService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        this.logger.log(`Received message: ${JSON.stringify(message)}`);

        try {
            const eventType = message.eventType;

            switch (eventType) {
                case AccountEventEnum.ACCOUNT_UPDATED:
                    await this.accountSyncHandler.handleAccountUpdatedEvent(message);
                    break;
                case CustomerEventEnum.CUSTOMER_UPDATED:
                    await this.customerSyncHandler.handleCustomerUpdatedEvent(message);
                    break;
                case AreaEventEnum.AREA_UPDATED:
                    await this.areaSyncHandler.handleAreaUpdatedEvent(message);
                    break;
                default:
                    this.logger.warn(`Unknown event type: ${eventType}`);
            }
        } catch (error) {
            this.logger.error(`Error handling message: ${error.message}`, error.stack);
            throw error;
        }
    }
}

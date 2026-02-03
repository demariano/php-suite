import { AreaEventEnum, CustomerClassificationEventEnum, CustomerTypeEventEnum, TerritoryManagerEventEnum } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { AreaSyncHandlerService } from './area-sync-handler/area-sync-handler.service';
import { CustomerClassificationSyncHandlerService } from './customer-classification-sync-handler/customer-classification-sync-handler.service';
import { CustomerTypeSyncHandlerService } from './customer-type-sync-handler/customer-type-sync-handler.service';
import { TerritoryManagerSyncHandlerService } from './territory-manager-sync-handler/territory-manager-sync-handler.service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        private readonly customerClassificationSyncHandler: CustomerClassificationSyncHandlerService,
        private readonly customerTypeSyncHandler: CustomerTypeSyncHandlerService,
        private readonly areaSyncHandler: AreaSyncHandlerService,
        private readonly territoryManagerSyncHandler: TerritoryManagerSyncHandlerService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(message: any) {
        this.logger.log(`Received message: ${JSON.stringify(message)}`);

        try {
            const eventType = message.eventType;

            switch (eventType) {
                case CustomerClassificationEventEnum.CUSTOMER_CLASSIFICATION_UPDATED:
                    await this.customerClassificationSyncHandler.handleCustomerClassificationUpdatedEvent(message);
                    break;
                case CustomerTypeEventEnum.CUSTOMER_TYPE_UPDATED:
                    await this.customerTypeSyncHandler.handleCustomerTypeUpdatedEvent(message);
                    break;
                case AreaEventEnum.AREA_UPDATED:
                    await this.areaSyncHandler.handleAreaUpdatedEvent(message);
                    break;
                case TerritoryManagerEventEnum.TERRITORY_MANAGER_UPDATED:
                    await this.territoryManagerSyncHandler.handleTerritoryManagerUpdatedEvent(message);
                    break;
                case TerritoryManagerEventEnum.TERRITORY_MANAGER_REACTIVATED:
                    await this.territoryManagerSyncHandler.handleTerritoryManagerReactivatedEvent(message);
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

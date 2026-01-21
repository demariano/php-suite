import { TerritoryManagerEventEnum } from '../../enums/territory-manager.event.enum';

export interface TerritoryManagerEventDto {
    eventType: TerritoryManagerEventEnum;
    territoryManagerId: string;
    newTerritoryManagerName: string;
    timestamp: string;
}

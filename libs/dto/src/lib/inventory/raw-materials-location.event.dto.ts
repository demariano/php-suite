import { RawMaterialsLocationEventEnum } from '../enums/raw-materials-location.event.enum';

export interface RawMaterialsLocationEventDto {
    eventType: RawMaterialsLocationEventEnum;
    rawMaterialsLocationId: string;
    newRawMaterialsLocationName: string;
    timestamp: string;
}

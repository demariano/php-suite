import { RawMaterialEventEnum } from '../enums/raw-material.event.enum';

export interface RawMaterialEventDto {
    eventType: RawMaterialEventEnum;
    rawMaterialId: string;
    newRawMaterialName: string;
    timestamp: string;
}

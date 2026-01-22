import { RawMaterialUnitEventEnum } from '../enums/raw-material-unit.event.enum';

export interface RawMaterialUnitEventDto {
    eventType: RawMaterialUnitEventEnum;
    rawMaterialUnitId: string;
    newRawMaterialUnitName: string;
    timestamp: string;
}

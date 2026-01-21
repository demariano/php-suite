import { AreaEventEnum } from '../../enums/area.event.enum';

export interface AreaEventDto {
    eventType: AreaEventEnum;
    areaId: string;
    newAreaName: string;
    timestamp?: string;
}

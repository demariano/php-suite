import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';
import { DeliveryDetailsDto } from './delivery-details.dto';

export class StockDeliveryDto {
    @ApiProperty()
    stockDeliveryId?: string;

    @ApiProperty({
        enum: StatusEnum,
        required: false,
    })
    status?: StatusEnum;

    @ApiProperty()
    supplierId?: string;

    @ApiProperty()
    supplierName?: string;

    @ApiProperty()
    dateReceived?: string;

    @ApiProperty()
    docno?: string;

    @ApiProperty({
        type: [DeliveryDetailsDto],
        isArray: true,
    })
    deliveryDetails?: DeliveryDetailsDto[];

    @ApiProperty({
        type: [String],
        required: false,
    })
    activityLogs?: string[];

    @ApiProperty({
        type: Object,
        required: false,
    })
    forApprovalVersion?: Record<string, unknown>;

    @ApiProperty()
    changeReason?: string;

    @ApiProperty()
    approverMessage?: string | null;
}

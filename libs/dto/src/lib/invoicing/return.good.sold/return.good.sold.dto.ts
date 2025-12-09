import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../../enums/status.enum';

export class ReturnGoodSoldDto {
    @ApiProperty()
    returnGoodSoldId!: string;

    @ApiProperty()
    invoiceId!: string;

    @ApiProperty()
    customerId!: string;

    @ApiProperty()
    customerName!: string;

    @ApiProperty()
    invoiceDocno!: string;

    @ApiProperty()
    rgsDocno!: string;

    @ApiProperty()
    activityLogs!: string[];

    @ApiProperty()
    dateReturned!: string;

    @ApiProperty()
    forApprovalVersion!: Record<string, unknown>;

    @ApiProperty({
        enum: StatusEnum,
    })
    status?: StatusEnum;

    @ApiProperty()
    changeReason!: string;

    @ApiProperty({ type: Array, isArray: true })
    originalInvoiceDetails!: Array<any>;

    @ApiProperty({ type: Array, isArray: true })
    modifiedInvoiceDetails!: Array<any>;

    @ApiProperty()
    approverMessage?: string | null;
}

import { ApiProperty } from '@nestjs/swagger';

export class CancelledReceiptNumberDto {
    @ApiProperty()
    receiptNumber!: number;

    @ApiProperty()
    cancellationReason!: string;

    @ApiProperty()
    cancelledBy!: string;

    @ApiProperty()
    cancelledAt!: string;

    @ApiProperty({ required: false })
    paymentId?: string;
}


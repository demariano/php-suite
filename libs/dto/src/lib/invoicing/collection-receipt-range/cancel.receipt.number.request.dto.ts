import { ApiProperty } from '@nestjs/swagger';

export class CancelReceiptNumberRequestDto {
    @ApiProperty({ description: 'Collection Receipt Range ID' })
    collectionReceiptRangeId!: string;

    @ApiProperty({ description: 'Receipt number to cancel' })
    receiptNumber!: number;

    @ApiProperty({ description: 'Reason for cancellation' })
    cancellationReason!: string;
}


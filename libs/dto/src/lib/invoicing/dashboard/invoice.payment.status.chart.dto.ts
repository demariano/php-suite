import { ApiProperty } from '@nestjs/swagger';

export class WeeklyPaymentStatusDto {
    @ApiProperty()
    week!: string;

    @ApiProperty()
    paid!: number;

    @ApiProperty()
    overpaid!: number;

    @ApiProperty()
    partial!: number;

    @ApiProperty()
    unpaid!: number;
}

export class InvoicePaymentStatusChartDto {
    @ApiProperty({ type: [WeeklyPaymentStatusDto], isArray: true })
    weeklyData!: WeeklyPaymentStatusDto[];
}

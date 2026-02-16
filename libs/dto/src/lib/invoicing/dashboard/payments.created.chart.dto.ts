import { ApiProperty } from '@nestjs/swagger';

export class WeeklyPaymentAmountDto {
    @ApiProperty()
    week!: string;

    @ApiProperty()
    amount!: number;
}

export class PaymentsCreatedChartDto {
    @ApiProperty({ type: [WeeklyPaymentAmountDto], isArray: true })
    weeklyData!: WeeklyPaymentAmountDto[];
}

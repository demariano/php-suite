import { ApiProperty } from '@nestjs/swagger';

export class WeeklyRGSCountDto {
    @ApiProperty()
    week!: string;

    @ApiProperty()
    count!: number;
}

export class ReturnGoodsSoldChartDto {
    @ApiProperty()
    totalReturns!: number;

    @ApiProperty({ type: [WeeklyRGSCountDto], isArray: true })
    weeklyData!: WeeklyRGSCountDto[];
}

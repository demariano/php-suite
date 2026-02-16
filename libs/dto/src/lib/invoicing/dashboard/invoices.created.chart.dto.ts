import { ApiProperty } from '@nestjs/swagger';

export class WeeklyInvoiceCreatedDto {
    @ApiProperty()
    week!: string;

    @ApiProperty()
    contractSales!: number;

    @ApiProperty()
    nonContractSales!: number;
}

export class InvoicesCreatedChartDto {
    @ApiProperty()
    totalInvoices!: number;

    @ApiProperty({ type: [WeeklyInvoiceCreatedDto], isArray: true })
    weeklyData!: WeeklyInvoiceCreatedDto[];
}

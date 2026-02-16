import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
    @ApiProperty()
    activeContracts!: number;

    @ApiProperty()
    totalInvoicesMTD!: number;

    @ApiProperty()
    pendingPayments!: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class ContractExpirationItemDto {
    @ApiProperty()
    contractId!: string;

    @ApiProperty()
    contractName!: string;

    @ApiProperty()
    contractNo!: string;

    @ApiProperty()
    customerName!: string;

    @ApiProperty()
    endDate!: string;

    @ApiProperty()
    daysLeft!: number;

    @ApiProperty()
    urgency!: 'active' | '30days' | 'expiring_soon';
}

export class ContractExpirationDto {
    @ApiProperty({ type: [ContractExpirationItemDto], isArray: true })
    contracts!: ContractExpirationItemDto[];
}

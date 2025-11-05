import { ApiProperty } from '@nestjs/swagger';

export class VoucherDetailDto {
    @ApiProperty()
    subAccount!: string;

    @ApiProperty()
    amount!: number;
}

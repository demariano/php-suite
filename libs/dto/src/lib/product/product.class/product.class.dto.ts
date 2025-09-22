import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from '../enums/status.enum';
export class ProductClassDto {
    @ApiProperty()
    productClassId!: string;

    @ApiProperty()
    productClassName?: string;

    @ApiProperty({ enum: StatusEnum })
    status?: StatusEnum;

}

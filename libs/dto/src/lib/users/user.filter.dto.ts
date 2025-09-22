import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UserFilterDto {

    @ApiProperty({ type: Date })
    dateFrom!: string;

    @ApiProperty({ type: Date })
    dateTo!: string;

    @ApiProperty({ type: [String], required: false })
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    userRole?: string[];

    @ApiProperty({ type: [String], required: false })
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    userStatus?: string[];

    
    @ApiProperty({ type: Boolean, required: false, default: false })
    @Transform(({ value }) => value === 'true')
    reverse?: boolean;

    @ApiProperty({ type: String, required: false })
    email?: string;

    @ApiProperty({ type: [String], required: false })
    fields?: string[];


}

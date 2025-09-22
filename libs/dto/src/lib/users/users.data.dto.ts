import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
    @ApiProperty()
    country!: string;
}
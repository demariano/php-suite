import { ApiProperty } from '@nestjs/swagger';

export class CognitoDto {
    @ApiProperty()
    email!: string;

    @ApiProperty()
    password!: string;


}

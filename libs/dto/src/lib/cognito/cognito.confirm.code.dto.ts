import { ApiProperty } from '@nestjs/swagger';

export class CognitoConfirmCodeDto {
    @ApiProperty()
    email!: string;

    @ApiProperty()
    password!: string;

    @ApiProperty()
    code!: string;
}

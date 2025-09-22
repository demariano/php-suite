import { ApiProperty } from '@nestjs/swagger';

export class CognitoForgotPasswordDto {
    @ApiProperty()
    email!: string;

    @ApiProperty()
    code!: string;

    @ApiProperty()
    password!: string;
}

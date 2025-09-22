import { ApiProperty } from '@nestjs/swagger';

export class CognitoCompleteNewPasswordDto {
    @ApiProperty()
    email!: string;

    @ApiProperty()
    password!: string;

    @ApiProperty()
    session!: string;
}

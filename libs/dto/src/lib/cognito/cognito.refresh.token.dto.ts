import { ApiProperty } from '@nestjs/swagger';

export class CognitoRefreshTokenDto {


    @ApiProperty()
    refreshToken!: string;
}

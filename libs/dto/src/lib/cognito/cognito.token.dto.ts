import { ApiProperty } from '@nestjs/swagger';

export class CognitoTokenDto {
    @ApiProperty()
    grant_type!: string;

    @ApiProperty()
    client_id!: string;

    @ApiProperty()
    code!: string;

    @ApiProperty()
    redirect_uri!: string;
}

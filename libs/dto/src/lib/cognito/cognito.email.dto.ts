import { ApiProperty } from '@nestjs/swagger';

export class CognitoEmailDto {
    @ApiProperty()
    email!: string;
}

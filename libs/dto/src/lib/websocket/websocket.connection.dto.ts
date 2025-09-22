import { ApiProperty } from '@nestjs/swagger';

export class WebSocketConnectionDto {
    @ApiProperty()
    connectionId!: string;

    @ApiProperty()
    userEmail?: string;

    @ApiProperty()
    connectedAt!: string;
}

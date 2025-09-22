import { ApiProperty } from '@nestjs/swagger';

export class BroadcastMessageDto {
    @ApiProperty()
    action?: string;

    @ApiProperty()
    connectionId!: string;

    @ApiProperty()
    message!: string;

    @ApiProperty({ default: false })
    broadcastToAll = false;
}

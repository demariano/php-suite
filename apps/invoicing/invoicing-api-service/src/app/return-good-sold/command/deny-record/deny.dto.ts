import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DenyReturnGoodSoldDto {
    @ApiProperty({
        description: 'Reason for denying the return good sold record',
        example: 'Return good sold information is incomplete or incorrect',
        minLength: 3,
    })
    @IsNotEmpty({ message: 'Approver message is required' })
    @IsString({ message: 'Approver message must be a string' })
    @MinLength(3, { message: 'Approver message must be at least 3 characters long' })
    approverMessage!: string;
}


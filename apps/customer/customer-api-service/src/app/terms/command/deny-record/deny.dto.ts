import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DenyTermsDto {
    @ApiProperty({
        description: 'Reason for denying the terms change request',
        minLength: 3,
    })
    @IsNotEmpty({ message: 'Approver message cannot be empty' })
    @IsString({ message: 'Approver message must be a string' })
    @MinLength(3, { message: 'Approver message must be at least 3 characters long' })
    approverMessage!: string;
}


import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class ResponseDto<T> {
    @IsArray()
    readonly body: T;

    @ApiProperty()
    statusCode!: number;


    constructor(body: T, statusCode: number) {
        this.statusCode = statusCode;
        this.body = body;

    }
}

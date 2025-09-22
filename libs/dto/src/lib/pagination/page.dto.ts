import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class PageDto<T> {
    @IsArray()
    @ApiProperty({ isArray: true })
    readonly data: T[];

    @ApiProperty()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextCursorPointer?: { [key: string]: any } | null;

    @ApiProperty()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prevCursorPointer?: { [key: string]: any } | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(data: T[], nextCursorPointer: any | null, prevCursorPointer: any | null) {
        this.data = data;

        this.nextCursorPointer = nextCursorPointer;

        this.prevCursorPointer = prevCursorPointer;
    }
}

import { BadRequestException } from '@nestjs/common';

export function createDynamoDbOptionWithPKSKIndex(
    limit: number,
    indexName: string,
    direction: string,
    cursorPointer: string
) {
    if (!limit || limit == 0) {
        limit = 0;
    }

    //somehow limit is coming as string
    const limitNumber = parseInt(limit.toString());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbOptions: { [key: string]: any } = {};

    dbOptions['limit'] = limitNumber + 1;
    dbOptions['follow'] = true;

    if (cursorPointer != null && cursorPointer.trim() !== '') {
        const sanitizedCursorPointer = decodeURIComponent(cursorPointer);
        dbOptions[cursorPointer] = JSON.parse(sanitizedCursorPointer);
    }

    if (direction != null) {
        dbOptions[direction] = {};

        if (cursorPointer == null || cursorPointer.trim() === '') {
            throw new BadRequestException("Cursor Pointer Can't be null or empty if direction is not null");
        }

        dbOptions[direction] = JSON.parse(cursorPointer);
    }

    if (indexName != null) {
        dbOptions['index'] = indexName;
    }

    return dbOptions;
}

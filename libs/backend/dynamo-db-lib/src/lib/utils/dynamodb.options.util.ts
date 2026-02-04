import { BadRequestException } from '@nestjs/common';

export function createDynamoDbOptionWithPKSKIndex(
    limit: number,
    indexName: string,
    direction: string,
    cursorPointer: string,
    reverse = false
) {
    // Normalize empty strings to undefined (NestJS converts missing query params to empty strings)
    const normalizedDirection = direction && direction.trim() !== '' ? direction : undefined;
    const normalizedCursor = cursorPointer && cursorPointer.trim() !== '' ? cursorPointer : undefined;

    if (!limit || limit == 0) {
        limit = 0;
    }

    //somehow limit is coming as string
    const limitNumber = parseInt(limit.toString());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbOptions: { [key: string]: any } = {};

    dbOptions['limit'] = limitNumber + 1;
    dbOptions['follow'] = true;
    dbOptions['reverse'] = reverse;

    if (normalizedDirection != null) {
        dbOptions[normalizedDirection] = {};

        if (normalizedCursor == null) {
            throw new BadRequestException("Cursor Pointer Can't be null or empty if direction is not null");
        }

        dbOptions[normalizedDirection] = JSON.parse(normalizedCursor);
    }

    if (indexName != null) {
        dbOptions['index'] = indexName;
    }

    return dbOptions;
}

import { PageDto } from "@dto";

export function pageRecordHandler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    records: any[],
    limit: number,
    direction: string,
    indexKey: string,
    sortKey: string,
    primaryKey: string,
    primarySortKey: string,
    nextCursorPointer: string,
    prevCursorPointer: string,


) {
    const pageDto = new PageDto(
        records,
        {},
        {}
    );

    const originalNextCursorPointer = nextCursorPointer ? JSON.parse(nextCursorPointer) : null;
    const originalPrevCursorPointer = prevCursorPointer ? JSON.parse(prevCursorPointer) : null;

    pageDto.nextCursorPointer = originalNextCursorPointer;
    pageDto.prevCursorPointer = originalPrevCursorPointer;


    if (records.length == 0) {
        pageDto.nextCursorPointer = null;
        pageDto.prevCursorPointer = null;
        return pageDto;
    }


    if (records.length < limit) {
        pageDto.nextCursorPointer = null;
        return pageDto;
    }



    if (nextCursorPointer != null) {
        if (direction != 'prev') {
            records.pop();
        }
        //based on the indexKey and sortKey, we need to create the nextCursorPointer    
        const nextCursorPointer = getNextCursorPointer(records, indexKey, sortKey, primaryKey, primarySortKey, limit);


        pageDto.nextCursorPointer = nextCursorPointer;
    }

    if (prevCursorPointer != null) {

        if (direction != 'next') {
            records.shift();
        }

        const prevCursorPointer = getPrevCursorPointer(records, indexKey, sortKey, primaryKey, primarySortKey, limit);



        pageDto.prevCursorPointer = prevCursorPointer;
    }

    return pageDto;

}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNextCursorPointer(records: any[], indexKey: string, sortKey: string, primaryKey: string, primarySortKey: string, limit: number) {


    if (records.length < limit) {

        return null;
    }

    const secondLastRecord = records[records.length - 1];



    return {
        [indexKey]: secondLastRecord[indexKey],
        [sortKey]: secondLastRecord[sortKey],
        [primaryKey]: secondLastRecord[primaryKey],
        [primarySortKey]: secondLastRecord[primarySortKey],
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPrevCursorPointer(records: any[], indexKey: string, sortKey: string, primaryKey: string, primarySortKey: string, limit: number) {


    if (records.length > limit) {
        return null;
    }

    const firstRecord = records[0];

    return {
        [indexKey]: firstRecord[indexKey],
        [sortKey]: firstRecord[sortKey],
        [primaryKey]: firstRecord[primaryKey],
        [primarySortKey]: firstRecord[primarySortKey],
    }
}

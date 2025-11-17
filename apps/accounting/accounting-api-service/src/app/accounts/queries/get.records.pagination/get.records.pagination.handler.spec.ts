import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, PageDto } from '@dto';
import { GetRecordsPaginationHandler } from './get.records.pagination.handler';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

describe('GetRecordsPaginationHandler', () => {
    let handler: GetRecordsPaginationHandler;
    let databaseService: jest.Mocked<AccountsDatabaseServiceAbstract>;

    beforeEach(() => {
        databaseService = {
            findRecordsPagination: jest.fn(),
        } as unknown as jest.Mocked<AccountsDatabaseServiceAbstract>;

        handler = new GetRecordsPaginationHandler(databaseService);
    });

    it('retrieves paginated accounts using the database service', async () => {
        const paginatedResult = new PageDto<AccountsDto>([], null, null);
        databaseService.findRecordsPagination.mockResolvedValue(paginatedResult);

        const query = new GetRecordsPaginationQuery(10, 'next', 'cursor');
        const response = await handler.execute(query);

        expect(databaseService.findRecordsPagination).toHaveBeenCalledWith(10, 'next', 'cursor');
        expect(response.body).toBe(paginatedResult);
    });
});


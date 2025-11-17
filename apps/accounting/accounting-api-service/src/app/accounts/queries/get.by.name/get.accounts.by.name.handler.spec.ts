import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, PageDto, StatusEnum } from '@dto';
import { GetAccountsByNameHandler } from './get.accounts.by.name.handler';
import { GetAccountsByNameQuery } from './get.accounts.by.name.query';

describe('GetAccountsByNameHandler', () => {
    let handler: GetAccountsByNameHandler;
    let databaseService: jest.Mocked<AccountsDatabaseServiceAbstract>;

    beforeEach(() => {
        databaseService = {
            findRecordsByNamePagination: jest.fn(),
        } as unknown as jest.Mocked<AccountsDatabaseServiceAbstract>;

        handler = new GetAccountsByNameHandler(databaseService);
    });

    it('delegates to findRecordsByNamePagination and wraps response in ResponseDto', async () => {
        const paginatedResult = new PageDto<AccountsDto>(
            [
                {
                    accountingId: 'acc-1',
                    accountName: 'Sample Account',
                    status: StatusEnum.ACTIVE,
                } as AccountsDto,
            ],
            null,
            null
        );

        databaseService.findRecordsByNamePagination.mockResolvedValue(paginatedResult);

        const query = new GetAccountsByNameQuery('Sample', 10, 'next', 'cursor');
        const response = await handler.execute(query);

        expect(databaseService.findRecordsByNamePagination).toHaveBeenCalledWith(10, 'next', 'cursor', 'Sample');
        expect(response.body).toEqual(paginatedResult);
    });
});


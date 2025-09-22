import { PageDto, ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetRecordsPaginationHandler } from './get.records.pagination.handler';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

describe('GetRecordsPaginationHandler', () => {
    let handler: GetRecordsPaginationHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetRecordsPaginationHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordsPagination: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetRecordsPaginationHandler>(GetRecordsPaginationHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should return paginated user records', async () => {
        const query = new GetRecordsPaginationQuery(10, 'forward', 'cursor123');
        const userRecords: PageDto<UsersDto> = new PageDto<UsersDto>(
            [{ userId: '123', userStatus: UserStatus.PENDING, email: 'test@example.com', firstName: 'Test', lastName: 'User', userRole: UserRole.USER, data: { country: 'USA' } }],
            'nextCursor',
            'prevCursor'
        );

        userDatabaseService.findUserRecordsPagination.mockResolvedValue(userRecords);

        const result = await handler.execute(query);

        expect(userDatabaseService.findUserRecordsPagination).toHaveBeenCalledWith(10, 'forward', 'cursor123');
        expect(result).toEqual(new ResponseDto<PageDto<UsersDto>>(userRecords, 200));
    });

    it('should propagate error when pagination fails', async () => {
        const query = new GetRecordsPaginationQuery(10, 'forward', 'cursor123');
        const error = new Error('Pagination error');

        userDatabaseService.findUserRecordsPagination.mockRejectedValue(error);

        await expect(handler.execute(query)).rejects.toThrow('Pagination error');
    });
});
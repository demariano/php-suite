import { ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetUserByEmailHandler } from './get.user.by.email.handler';
import { GetUserByEmailQuery } from './get.user.by.email.query';


describe('GetUserByEmailHandler', () => {
    let handler: GetUserByEmailHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetUserByEmailHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordByEmail: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetUserByEmailHandler>(GetUserByEmailHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should return user data for a valid email', async () => {
        const query = new GetUserByEmailQuery('test@example.com');
        const userRecord: UsersDto = { userId: '123', userStatus: UserStatus.PENDING, email: 'test@example.com', firstName: 'Test', lastName: 'User', userRole: UserRole.USER, data: { country: 'USA' } };

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(userRecord);

        const result = await handler.execute(query);

        expect(userDatabaseService.findUserRecordByEmail).toHaveBeenCalledWith('test@example.com');
        expect(result).toEqual(new ResponseDto<UsersDto>(userRecord, 200));
    });

    it('should throw NotFoundException if user is not found', async () => {
        const query = new GetUserByEmailQuery('test@example.com');

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(null);

        await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });
});
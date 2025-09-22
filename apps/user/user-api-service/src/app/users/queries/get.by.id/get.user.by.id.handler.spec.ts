import { ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetUserByIdHandler } from './get.user.by.id.handler';
import { GetUserByIdQuery } from './get.user.by.id.query';

describe('GetUserByIdHandler', () => {
    let handler: GetUserByIdHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetUserByIdHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordById: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetUserByIdHandler>(GetUserByIdHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should return user data for a valid user ID', async () => {
        const query = new GetUserByIdQuery('123');
        const userRecord: UsersDto = { userId: '123', userStatus: UserStatus.PENDING, email: 'test@example.com', firstName: 'Test', lastName: 'User', userRole: UserRole.USER, data: { country: 'USA' } };

        userDatabaseService.findUserRecordById.mockResolvedValue(userRecord);

        const result = await handler.execute(query);

        expect(userDatabaseService.findUserRecordById).toHaveBeenCalledWith('123');
        expect(result).toEqual(new ResponseDto<UsersDto>(userRecord, 200));
    });

    it('should handle error when user is not found', async () => {
        const query = new GetUserByIdQuery('123');

        userDatabaseService.findUserRecordById.mockResolvedValue(null);

        try {
            await handler.execute(query);
        } catch (error) {
            expect(error).toBeInstanceOf(NotFoundException);
            expect(error.message).toBe('User not found for ID: 123');
        }
    });
});
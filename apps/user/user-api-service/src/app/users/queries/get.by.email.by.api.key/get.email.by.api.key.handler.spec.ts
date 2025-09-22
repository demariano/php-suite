import { ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetEmailByApiKeyHandler } from './get.email.by.api.key.handler';
import { GetEmailByApiKeyQuery } from './get.email.by.api.key.query';

describe('GetEmailByApiKeyHandler', () => {
    let handler: GetEmailByApiKeyHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetEmailByApiKeyHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordByEmail: jest.fn(),
                        convertToDto: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetEmailByApiKeyHandler>(GetEmailByApiKeyHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should return user data for a valid email and API key', async () => {
        const query = new GetEmailByApiKeyQuery('test@example.com');
        const userRecord: UsersDto = { userId: '123', userStatus: UserStatus.PENDING, email: 'test@example.com', firstName: 'Test', lastName: 'User', userRole: UserRole.USER, data: { country: 'USA' } };
        const usersDto: UsersDto = { userId: '123', userStatus: UserStatus.PENDING, email: 'test@example.com', firstName: 'Test', lastName: 'User', userRole: UserRole.USER, data: { country: 'USA' } };

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(userRecord);
        userDatabaseService.convertToDto.mockResolvedValue(usersDto);

        const result = await handler.execute(query);

        expect(userDatabaseService.findUserRecordByEmail).toHaveBeenCalledWith('test@example.com');
        expect(userDatabaseService.convertToDto).toHaveBeenCalledWith(userRecord);
        expect(result).toEqual(new ResponseDto<UsersDto>(usersDto, 200));
    });

    it('should handle error when user is not found', async () => {
        const query = new GetEmailByApiKeyQuery('test@example.com');

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(null);

        try {
            await handler.execute(query);
        } catch (error) {
            expect(error).toBeInstanceOf(NotFoundException);
            expect(error.message).toBe('User with email test@example.com not found');
        }
    });
});
import { ErrorResponseDto, ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { HardDeleteUserCommand } from './hard.delete.user.command';
import { HardDeleteUserHandler } from './hard.delete.user.handler';

describe('HardDeleteUserHandler', () => {
    let handler: HardDeleteUserHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HardDeleteUserHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordById: jest.fn(),
                        hardDeleteUserRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<HardDeleteUserHandler>(HardDeleteUserHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should hard delete user successfully', async () => {
        const command = new HardDeleteUserCommand('123');
        const userRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const deletedUsersDto: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };

        userDatabaseService.findUserRecordById.mockResolvedValue(userRecord);
        userDatabaseService.hardDeleteUserRecord.mockResolvedValue(deletedUsersDto);

        const result = await handler.execute(command);

        expect(userDatabaseService.findUserRecordById).toHaveBeenCalledWith('123');
        expect(userDatabaseService.hardDeleteUserRecord).toHaveBeenCalledWith(userRecord);
        expect(result).toEqual(new ResponseDto<UsersDto>(deletedUsersDto, 200));
    });

    it('should throw NotFoundException if user record is not found', async () => {
        const command = new HardDeleteUserCommand('123');

        userDatabaseService.findUserRecordById.mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(NotFoundException);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(NotFoundException);
            expect(exception.getResponse()).toEqual({
                error: 'Not Found',
                message: 'User record not found for id 123',
                statusCode: 404,
            });
        }
    });

    it('should throw BadRequestException when hardDeleteUserRecord fails', async () => {
        const command = new HardDeleteUserCommand('123');
        const userRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const error = new Error('Database error');

        userDatabaseService.findUserRecordById.mockResolvedValue(userRecord);
        userDatabaseService.hardDeleteUserRecord.mockRejectedValue(error);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Database error' }, 400)
            );
        }
    });
});

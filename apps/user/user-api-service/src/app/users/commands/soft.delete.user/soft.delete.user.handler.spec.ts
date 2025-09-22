import { ErrorResponseDto, ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { SoftDeleteUserCommand } from './soft.delete.user.command';
import { SoftDeleteUserHandler } from './soft.delete.user.handler';

describe('SoftDeleteUserHandler', () => {
    let handler: SoftDeleteUserHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SoftDeleteUserHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordById: jest.fn(),
                        softDeleteUserRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<SoftDeleteUserHandler>(SoftDeleteUserHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should soft delete user successfully', async () => {
        const command = new SoftDeleteUserCommand('123');
        const userRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const updatedUsersDto: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };

        userDatabaseService.findUserRecordById.mockResolvedValue(userRecord);
        userDatabaseService.softDeleteUserRecord.mockResolvedValue(updatedUsersDto);

        const result = await handler.execute(command);

        expect(userDatabaseService.findUserRecordById).toHaveBeenCalledWith('123');
        expect(userDatabaseService.softDeleteUserRecord).toHaveBeenCalledWith(userRecord);
        expect(result).toEqual(new ResponseDto<UsersDto>(updatedUsersDto, 200));
    });

    it('should throw NotFoundException if user record is not found', async () => {
        const command = new SoftDeleteUserCommand('123');

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

    it('should throw BadRequestException when softDeleteUserRecord fails', async () => {
        const command = new SoftDeleteUserCommand('123');
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
        userDatabaseService.softDeleteUserRecord.mockRejectedValue(error);

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

    it('should handle error with response body structure', async () => {
        const command = new SoftDeleteUserCommand('123');
        const userRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const error = {
            response: {
                body: {
                    errorMessage: 'Custom error message',
                },
            },
        };

        userDatabaseService.findUserRecordById.mockResolvedValue(userRecord);
        userDatabaseService.softDeleteUserRecord.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Custom error message' }, 400)
            );
        }
    });
});

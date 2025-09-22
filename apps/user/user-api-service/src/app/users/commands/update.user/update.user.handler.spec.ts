import { ErrorResponseDto, ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { UpdateUserCommand } from './update.user.command';
import { UpdateUserHandler } from './update.user.handler';

describe('UpdateUserHandler', () => {
    let handler: UpdateUserHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateUserHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordById: jest.fn(),
                        updateUserRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<UpdateUserHandler>(UpdateUserHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should update a user successfully', async () => {
        const userDto: UsersDto = {
            userId: '123',
            userStatus: UserStatus.ACTIVE,
            email: 'updated@example.com',
            firstName: 'Updated',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'Canada' },
        };
        const command = new UpdateUserCommand('123', userDto);
        const existingUserRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const updatedUserRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.ACTIVE,
            email: 'updated@example.com',
            firstName: 'Updated',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'Canada' },
        };

        userDatabaseService.findUserRecordById.mockResolvedValue(existingUserRecord);
        userDatabaseService.updateUserRecord.mockResolvedValue(updatedUserRecord);

        const result = await handler.execute(command);

        expect(userDatabaseService.findUserRecordById).toHaveBeenCalledWith('123');
        expect(userDatabaseService.updateUserRecord).toHaveBeenCalledWith(userDto);
        expect(result).toEqual(new ResponseDto<UsersDto>(updatedUserRecord, 200));
    });

    it('should throw NotFoundException if user record is not found', async () => {
        const userDto: UsersDto = {
            userId: '123',
            userStatus: UserStatus.ACTIVE,
            email: 'updated@example.com',
            firstName: 'Updated',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'Canada' },
        };
        const command = new UpdateUserCommand('123', userDto);

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

    it('should throw BadRequestException when updateUserRecord fails', async () => {
        const userDto: UsersDto = {
            userId: '123',
            userStatus: UserStatus.ACTIVE,
            email: 'updated@example.com',
            firstName: 'Updated',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'Canada' },
        };
        const command = new UpdateUserCommand('123', userDto);
        const existingUserRecord: UsersDto = {
            userId: '123',
            userStatus: UserStatus.PENDING,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userRole: UserRole.USER,
            data: { country: 'USA' },
        };
        const error = new Error('Database error');

        userDatabaseService.findUserRecordById.mockResolvedValue(existingUserRecord);
        userDatabaseService.updateUserRecord.mockRejectedValue(error);

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

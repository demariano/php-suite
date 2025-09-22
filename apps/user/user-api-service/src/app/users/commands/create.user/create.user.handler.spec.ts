
import { CreateUserDto, ErrorResponseDto, ResponseDto, UserRole, UsersDto, UserStatus } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { CreateUserCommand } from './create.user.command';
import { CreateUserHandler } from './create.user.handler';

describe('CreateUserHandler', () => {
    let handler: CreateUserHandler;
    let userDatabaseService: jest.Mocked<UserDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateUserHandler,
                {
                    provide: 'UserDatabaseService',
                    useValue: {
                        findUserRecordByEmail: jest.fn(),
                        createRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<CreateUserHandler>(CreateUserHandler);
        userDatabaseService = module.get('UserDatabaseService');
    });

    it('should create a user successfully', async () => {
        const userDto: CreateUserDto = { 
            email: 'test@example.com', 
            firstName: 'Test', 
            lastName: 'User', 
            userRole: UserRole.USER, 
            data: { country: 'USA' } 
        };
        const command = new CreateUserCommand(userDto);
        const createdUsersDto: UsersDto = { 
            userId: '123', 
            userStatus: UserStatus.PENDING, 
            email: 'test@example.com', 
            firstName: 'Test', 
            lastName: 'User', 
            userRole: UserRole.USER, 
            data: { country: 'USA' } 
        };

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(null); // No existing user
        userDatabaseService.createRecord.mockResolvedValue(createdUsersDto);

        const result = await handler.execute(command);

        expect(userDatabaseService.findUserRecordByEmail).toHaveBeenCalledWith('test@example.com');
        expect(userDatabaseService.createRecord).toHaveBeenCalledWith(userDto);
        expect(result).toEqual(new ResponseDto<UsersDto>(createdUsersDto, 201));
    });

    it('should throw BadRequestException if email already exists', async () => {
        const userDto: CreateUserDto = { 
            email: 'test@example.com', 
            firstName: 'Test', 
            lastName: 'User', 
            userRole: UserRole.USER, 
            data: { country: 'USA' } 
        };
        const command = new CreateUserCommand(userDto);
        const existingUser: UsersDto = { 
            userId: '456', 
            userStatus: UserStatus.PENDING, 
            email: 'test@example.com', 
            firstName: 'Existing', 
            lastName: 'User', 
            userRole: UserRole.USER, 
            data: { country: 'USA' } 
        };

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(existingUser);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
        
        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Email already exists' }, 400)
            );
        }
    });

    it('should throw BadRequestException if database error occurs', async () => {
        const userDto: CreateUserDto = { 
            email: 'test@example.com', 
            firstName: 'Test', 
            lastName: 'User', 
            userRole: UserRole.USER, 
            data: { country: 'USA' } 
        };
        const command = new CreateUserCommand(userDto);
        const error = new Error('Database error');

        userDatabaseService.findUserRecordByEmail.mockResolvedValue(null);
        userDatabaseService.createRecord.mockRejectedValue(error);

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
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminCreateUserCommand } from './admin.create.user.command';
import { AdminCreateUserHandler } from './admin.create.user.handler';

describe('AdminCreateUserHandler', () => {
    let handler: AdminCreateUserHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminCreateUserHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        adminCreateUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<AdminCreateUserHandler>(AdminCreateUserHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should create admin user successfully', async () => {
        const command = new AdminCreateUserCommand('test@example.com');
        const cognitoResponse: AdminCreateUserCommandOutput = {
            User: {
                Username: 'test-user-id',
                UserStatus: 'FORCE_CHANGE_PASSWORD',
                Attributes: [
                    {
                        Name: 'email',
                        Value: 'test@example.com',
                    },
                ],
            },
            $metadata: {},
        };

        cognitoService.adminCreateUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.adminCreateUser).toHaveBeenCalledWith({
            email: 'test@example.com',
        });
        expect(result).toEqual(new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when admin user creation fails', async () => {
        const command = new AdminCreateUserCommand('test@example.com');
        const error = new Error('User already exists');

        cognitoService.adminCreateUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'User already exists' }, 400)
            );
        }

        expect(cognitoService.adminCreateUser).toHaveBeenCalledWith({
            email: 'test@example.com',
        });
    });

    it('should handle complex error response structure', async () => {
        const command = new AdminCreateUserCommand('test@example.com');
        const error = {
            message: 'Admin create user failed',
            response: {
                body: {
                    errorMessage: 'Cannot create user - email already exists in system',
                },
            },
        };

        cognitoService.adminCreateUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>(
                    { errorMessage: 'Cannot create user - email already exists in system' },
                    400
                )
            );
        }

        expect(cognitoService.adminCreateUser).toHaveBeenCalledWith({
            email: 'test@example.com',
        });
    });

    it('should create admin user with different email format', async () => {
        const command = new AdminCreateUserCommand('admin.user@company.co.uk');
        const cognitoResponse: AdminCreateUserCommandOutput = {
            User: {
                Username: 'admin-user-id',
                UserStatus: 'FORCE_CHANGE_PASSWORD',
                Attributes: [
                    {
                        Name: 'email',
                        Value: 'admin.user@company.co.uk',
                    },
                ],
            },
            $metadata: {},
        };

        cognitoService.adminCreateUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.adminCreateUser).toHaveBeenCalledWith({
            email: 'admin.user@company.co.uk',
        });
        expect(result).toEqual(new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 200));
    });

    it('should handle AWS Cognito service errors', async () => {
        const command = new AdminCreateUserCommand('test@example.com');
        const error = new Error('AWS Cognito service unavailable');

        cognitoService.adminCreateUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'AWS Cognito service unavailable' }, 400)
            );
        }

        expect(cognitoService.adminCreateUser).toHaveBeenCalledWith({
            email: 'test@example.com',
        });
    });
});

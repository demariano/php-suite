import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminDeleteUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserHandler } from './delete.user..handler';
import { DeleteUserCommand } from './delete.user.command';

describe('DeleteUserHandler', () => {
    let handler: DeleteUserHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeleteUserHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        deleteUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<DeleteUserHandler>(DeleteUserHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should delete user successfully', async () => {
        const command = new DeleteUserCommand('test@example.com');
        const cognitoResponse: AdminDeleteUserCommandOutput = {
            $metadata: {}
        };

        cognitoService.deleteUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.deleteUser).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
        expect(result).toEqual(new ResponseDto<AdminDeleteUserCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when user deletion fails', async () => {
        const command = new DeleteUserCommand('test@example.com');
        const error = new Error('User not found');

        cognitoService.deleteUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'User not found' }, 400)
            );
        }

        expect(cognitoService.deleteUser).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
    });

    it('should handle complex error response structure', async () => {
        const command = new DeleteUserCommand('test@example.com');
        const error = {
            message: 'Delete failed',
            response: {
                body: {
                    errorMessage: 'Cannot delete user - user has active sessions'
                }
            }
        };

        cognitoService.deleteUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Cannot delete user - user has active sessions' }, 400)
            );
        }

        expect(cognitoService.deleteUser).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
    });

    it('should delete user with different email format', async () => {
        const command = new DeleteUserCommand('user.with.dots@example.co.uk');
        const cognitoResponse: AdminDeleteUserCommandOutput = {
            $metadata: {}
        };

        cognitoService.deleteUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.deleteUser).toHaveBeenCalledWith({
            email: 'user.with.dots@example.co.uk'
        });
        expect(result).toEqual(new ResponseDto<AdminDeleteUserCommandOutput>(cognitoResponse, 200));
    });
});

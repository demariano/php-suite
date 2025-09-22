
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminSetUserPasswordCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChangePasswordCommand } from './change.password.command';
import { ChangePasswordHandler } from './change.password.handler';

describe('ChangePasswordHandler', () => {
    let handler: ChangePasswordHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChangePasswordHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        changePassword: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ChangePasswordHandler>(ChangePasswordHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should change password successfully', async () => {
        const command = new ChangePasswordCommand('test@example.com', 'newPassword');
        const cognitoResponse: AdminSetUserPasswordCommandOutput = {
            $metadata: {}
        };

        cognitoService.changePassword.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.changePassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'newPassword'
        });
        expect(result).toEqual(new ResponseDto<AdminSetUserPasswordCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when password change fails', async () => {
        const command = new ChangePasswordCommand('test@example.com', 'newPassword');
        const error = new Error('Cognito error');

        cognitoService.changePassword.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Cognito error' }, 400)
            );
        }

        expect(cognitoService.changePassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'newPassword'
        });
    });
});
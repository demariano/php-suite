import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmPasswordCodeCommand } from './confirm.password.code.command';
import { ConfirmPasswordCodeHandler } from './confirm.password.code.handler';

describe('ConfirmPasswordCodeHandler', () => {
    let handler: ConfirmPasswordCodeHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfirmPasswordCodeHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        confirmPasswordCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ConfirmPasswordCodeHandler>(ConfirmPasswordCodeHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should confirm password code successfully', async () => {
        const command = new ConfirmPasswordCodeCommand('test@example.com', 'newPassword', 'code');
        const cognitoResponse: AdminRespondToAuthChallengeCommandOutput = {
            AuthenticationResult: {
                AccessToken: 'access-token',
                RefreshToken: 'refresh-token'
            },
            $metadata: {}
        };

        cognitoService.confirmPasswordCode.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.confirmPasswordCode).toHaveBeenCalledWith({
            email: 'test@example.com',
            code: 'code',
            password: 'newPassword'
        });
        expect(result).toEqual(new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when confirmation fails', async () => {
        const command = new ConfirmPasswordCodeCommand('test@example.com', 'newPassword', 'code');
        const error = new Error('Invalid code');

        cognitoService.confirmPasswordCode.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid code' }, 400)
            );
        }

        expect(cognitoService.confirmPasswordCode).toHaveBeenCalledWith({
            email: 'test@example.com',
            code: 'code',
            password: 'newPassword'
        });
    });
});
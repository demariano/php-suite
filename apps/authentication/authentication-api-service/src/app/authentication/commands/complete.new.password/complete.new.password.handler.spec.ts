import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompleteNewPasswordCommand } from './complete.new.password.command';
import { CompleteNewPasswordHandler } from './complete.new.password.handler';

describe('CompleteNewPasswordHandler', () => {
    let handler: CompleteNewPasswordHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CompleteNewPasswordHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        completeNewPassword: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<CompleteNewPasswordHandler>(CompleteNewPasswordHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should complete new password successfully', async () => {
        const command = new CompleteNewPasswordCommand('test@example.com', 'newPassword', 'sessionId');
        const cognitoResponse: AdminRespondToAuthChallengeCommandOutput = {
            Session: 'new-session',
            $metadata: {}
        };

        cognitoService.completeNewPassword.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.completeNewPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'newPassword',
            session: 'sessionId'
        });
        expect(result).toEqual(new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when completion fails', async () => {
        const command = new CompleteNewPasswordCommand('test@example.com', 'newPassword', 'sessionId');
        const error = new Error('Invalid session');

        cognitoService.completeNewPassword.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid session' }, 400)
            );
        }

        expect(cognitoService.completeNewPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'newPassword',
            session: 'sessionId'
        });
    });
});
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { VerifyMFACodeHandler } from './verify.mfa..confirmation.code.handler';
import { VerifyMFACodeCommand } from './verify.mfa.confirmation.code.command';

describe('VerifyMFACodeHandler', () => {
    let handler: VerifyMFACodeHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VerifyMFACodeHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        verifyMFACode: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<VerifyMFACodeHandler>(VerifyMFACodeHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    });

    it('should verify MFA code successfully', async () => {
        const command = new VerifyMFACodeCommand('test@example.com', '123456', 'session-id');
        const cognitoResponse: AdminRespondToAuthChallengeCommandOutput = {
            AuthenticationResult: {
                AccessToken: 'access-token',
                IdToken: 'id-token',
                RefreshToken: 'refresh-token'
            },
            $metadata: {}
        };

        cognitoService.verifyMFACode.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.verifyMFACode).toHaveBeenCalledWith('test@example.com', '123456', 'session-id');
        expect(result).toEqual(new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when MFA verification fails', async () => {
        const command = new VerifyMFACodeCommand('test@example.com', '123456', 'session-id');
        const error = new Error('Invalid MFA code');

        cognitoService.verifyMFACode.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid MFA code' }, 400)
            );
        }

        expect(cognitoService.verifyMFACode).toHaveBeenCalledWith('test@example.com', '123456', 'session-id');
    });
});

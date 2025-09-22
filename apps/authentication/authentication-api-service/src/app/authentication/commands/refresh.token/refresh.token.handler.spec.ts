import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AuthenticationResultType } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoRefreshTokenDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenCommand } from './refresh.token.command';
import { RefreshTokenHandler } from './refresh.token.handler';

describe('RefreshTokenHandler', () => {
    let handler: RefreshTokenHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RefreshTokenHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        refreshToken: jest.fn(),
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

        handler = module.get<RefreshTokenHandler>(RefreshTokenHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    });

    it('should refresh token successfully', async () => {
        const refreshTokenDto: CognitoRefreshTokenDto = {
            refreshToken: 'valid-refresh-token'
        };
        const command = new RefreshTokenCommand(refreshTokenDto);
        const cognitoResponse: AuthenticationResultType = {
            AccessToken: 'new-access-token',
            IdToken: 'new-id-token',
            TokenType: 'Bearer',
            ExpiresIn: 3600
        };

        cognitoService.refreshToken.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
        expect(result).toEqual(new ResponseDto<AuthenticationResultType>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when token refresh fails', async () => {
        const refreshTokenDto: CognitoRefreshTokenDto = {
            refreshToken: 'invalid-refresh-token'
        };
        const command = new RefreshTokenCommand(refreshTokenDto);
        const error = new Error('Invalid refresh token');

        cognitoService.refreshToken.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid refresh token' }, 400)
            );
        }

        expect(cognitoService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('should handle complex error response structure', async () => {
        const refreshTokenDto: CognitoRefreshTokenDto = {
            refreshToken: 'expired-refresh-token'
        };
        const command = new RefreshTokenCommand(refreshTokenDto);
        const error = {
            message: 'Token expired',
            response: {
                body: {
                    errorMessage: 'Refresh token has expired'
                }
            }
        };

        cognitoService.refreshToken.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Refresh token has expired' }, 400)
            );
        }

        expect(cognitoService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
});


import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminInitiateAuthCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoginCommand } from './login.command';
import { LoginHandler } from './login.handler';

describe('LoginHandler', () => {
    let handler: LoginHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoginHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        loginUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<LoginHandler>(LoginHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should login user successfully', async () => {
        const command = new LoginCommand('test@example.com', 'password');
        const cognitoResponse: AdminInitiateAuthCommandOutput = {
            AuthenticationResult: {
                AccessToken: 'mock-access-token',
                IdToken: 'mock-id-token'
            },
            $metadata: {}
        };

        cognitoService.loginUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.loginUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
        expect(result).toEqual(new ResponseDto<AdminInitiateAuthCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when login fails', async () => {
        const command = new LoginCommand('test@example.com', 'password');
        const error = new Error('Invalid credentials');

        cognitoService.loginUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid credentials' }, 400)
            );
        }

        expect(cognitoService.loginUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
    });
});
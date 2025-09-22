

import { AwsCognitoLibService } from '@aws-cognito-lib';
import { SignUpCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignUpUserCommand } from './sign.up.user.command';
import { SignUpUserHandler } from './sign.up.user.handler';

describe('SignUpUserHandler', () => {
    let handler: SignUpUserHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SignUpUserHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        signupUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<SignUpUserHandler>(SignUpUserHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should sign up user successfully', async () => {
        const command = new SignUpUserCommand('test@example.com', 'password');
        const cognitoResponse: SignUpCommandOutput = {
            UserConfirmed: false,
            UserSub: 'test-user-id',
            $metadata: {}
        };

        cognitoService.signupUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.signupUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
        expect(result).toEqual(new ResponseDto<SignUpCommandOutput>(cognitoResponse, 201));
    });

    it('should throw BadRequestException when signup fails', async () => {
        const command = new SignUpUserCommand('test@example.com', 'password');
        const error = new Error('User already exists');

        cognitoService.signupUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'User already exists' }, 400)
            );
        }

        expect(cognitoService.signupUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
    });
});
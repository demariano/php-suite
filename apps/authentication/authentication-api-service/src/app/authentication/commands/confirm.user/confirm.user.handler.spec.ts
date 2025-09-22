
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminRespondToAuthChallengeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmUserCommand } from './confirm.user.command';
import { ConfirmUserHandler } from './confirm.user.handler';

describe('ConfirmUserHandler', () => {
    let handler: ConfirmUserHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfirmUserHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        confirmUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ConfirmUserHandler>(ConfirmUserHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should confirm user successfully', async () => {
        const command = new ConfirmUserCommand('test@example.com', 'code');
        const cognitoResponse: AdminRespondToAuthChallengeCommandOutput = {
            $metadata: {}
        };

        cognitoService.confirmUser.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.confirmUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            code: 'code'
        });
        expect(result).toEqual(new ResponseDto<AdminRespondToAuthChallengeCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when confirmation fails', async () => {
        const command = new ConfirmUserCommand('test@example.com', 'code');
        const error = new Error('Invalid confirmation code');

        cognitoService.confirmUser.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid confirmation code' }, 400)
            );
        }

        expect(cognitoService.confirmUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            code: 'code'
        });
    });
});
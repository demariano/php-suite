import { AwsCognitoLibService } from '@aws-cognito-lib';
import { ResendConfirmationCodeCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResendConfirmationCodeCommand } from './resend.confirmation.code.command';
import { ResendConfirmationCodeHandler } from './resend.confirmation.code.handler';

describe('ResendConfirmationCodeHandler', () => {
    let handler: ResendConfirmationCodeHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResendConfirmationCodeHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        resendConfirmationCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ResendConfirmationCodeHandler>(ResendConfirmationCodeHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should resend confirmation code successfully', async () => {
        const command = new ResendConfirmationCodeCommand('test@example.com');
        const cognitoResponse: ResendConfirmationCodeCommandOutput = {
            CodeDeliveryDetails: {
                Destination: 'test@example.com',
                DeliveryMedium: 'EMAIL'
            },
            $metadata: {}
        };

        cognitoService.resendConfirmationCode.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.resendConfirmationCode).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
        expect(result).toEqual(new ResponseDto<ResendConfirmationCodeCommandOutput>(cognitoResponse, 201));
    });

    it('should throw BadRequestException when resend fails', async () => {
        const command = new ResendConfirmationCodeCommand('test@example.com');
        const error = new Error('User not found');

        cognitoService.resendConfirmationCode.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'User not found' }, 400)
            );
        }

        expect(cognitoService.resendConfirmationCode).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
    });
});
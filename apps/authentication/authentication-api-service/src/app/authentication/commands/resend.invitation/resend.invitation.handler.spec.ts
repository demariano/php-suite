
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { AdminCreateUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResendInvitationCommand } from './resend.invitation.command';
import { ResendInvitationHandler } from './resend.invitation.handler';

describe('ResendInvitationHandler', () => {
    let handler: ResendInvitationHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResendInvitationHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        resendInvitation: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ResendInvitationHandler>(ResendInvitationHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
    });

    it('should resend invitation successfully', async () => {
        const command = new ResendInvitationCommand('test@example.com');
        const cognitoResponse: AdminCreateUserCommandOutput = {
            User: {
                Username: 'test@example.com'
            },
            $metadata: {}
        };

        cognitoService.resendInvitation.mockResolvedValue(cognitoResponse);

        const result = await handler.execute(command);

        expect(cognitoService.resendInvitation).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
        expect(result).toEqual(new ResponseDto<AdminCreateUserCommandOutput>(cognitoResponse, 201));
    });

    it('should throw BadRequestException when resend fails', async () => {
        const command = new ResendInvitationCommand('test@example.com');
        const error = new Error('User not found');

        cognitoService.resendInvitation.mockRejectedValue(error);

        try {
            await handler.execute(command);
        } catch (exception) {
            expect(exception).toBeInstanceOf(BadRequestException);
            expect(exception.getResponse()).toEqual(
                new ResponseDto<ErrorResponseDto>({ errorMessage: 'User not found' }, 400)
            );
        }

        expect(cognitoService.resendInvitation).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
    });
});
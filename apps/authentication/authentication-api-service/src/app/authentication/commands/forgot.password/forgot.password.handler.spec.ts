
import { AwsCognitoLibService } from '@aws-cognito-lib';
import { ForgotPasswordCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { AwsSesLibService } from '@aws-ses-lib';
import { ConfigurationDatabaseServiceAbstract } from "@configuration-database-service";
import { ResponseDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ForgotPasswordCommand } from './forgot.password.command';
import { ForgotPasswordHandler } from './forgot.password.handler';

describe('ForgotPasswordHandler', () => {
    let handler: ForgotPasswordHandler;
    let cognitoService: jest.Mocked<AwsCognitoLibService>;
    let configurationService: jest.Mocked<ConfigurationDatabaseServiceAbstract>;
    let emailService: jest.Mocked<AwsSesLibService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForgotPasswordHandler,
                {
                    provide: AwsCognitoLibService,
                    useValue: {
                        changePassword: jest.fn(),
                    },
                },
                {
                    provide: 'ConfigurationDatabaseService',
                    useValue: {
                        findRecordByName: jest.fn(),
                    },
                },
                {
                    provide: AwsSesLibService,
                    useValue: {
                        sendEmail: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<ForgotPasswordHandler>(ForgotPasswordHandler);
        cognitoService = module.get(AwsCognitoLibService) as jest.Mocked<AwsCognitoLibService>;
        configurationService = module.get('ConfigurationDatabaseService') as jest.Mocked<ConfigurationDatabaseServiceAbstract>;
        emailService = module.get(AwsSesLibService) as jest.Mocked<AwsSesLibService>;
    });

    it('should trigger forgot password successfully', async () => {
        const command = new ForgotPasswordCommand('test@example.com');
        const mockConfig = { 
            configurationId: 'ses-from-email',
            configurationValue: 'test@company.com' 
        };
        const cognitoResponse: ForgotPasswordCommandOutput = { $metadata: {} };

        configurationService.findRecordByName.mockResolvedValue(mockConfig);
        cognitoService.changePassword.mockResolvedValue(cognitoResponse);
        emailService.sendEmail.mockResolvedValue({});

        const result = await handler.execute(command);

        expect(configurationService.findRecordByName).toHaveBeenCalledWith('SES_FROM_EMAIL');
        expect(cognitoService.changePassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: expect.any(String)
        });
        expect(emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
            toAddress: 'test@example.com',
            source: 'test@company.com',
            subjectData: 'Your New Password'
        }));
        expect(result).toEqual(new ResponseDto<ForgotPasswordCommandOutput>(cognitoResponse, 200));
    });

    it('should throw BadRequestException when operation fails', async () => {
        const command = new ForgotPasswordCommand('test@example.com');
        const error = new Error('Cognito error');

        configurationService.findRecordByName.mockResolvedValue({ 
            configurationId: 'ses-from-email',
            configurationValue: 'test@company.com' 
        });
        cognitoService.changePassword.mockRejectedValue(error);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
        expect(cognitoService.changePassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: expect.any(String)
        });
    });
});
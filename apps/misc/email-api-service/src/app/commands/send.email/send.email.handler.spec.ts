import { AwsSesLibService } from '@aws-ses-lib';
import { EmailNotificationDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SendEmailCommand } from './send.email.command';
import { SendEmailHandler } from './send.email.handler';

describe('SendEmailHandler', () => {
    let handler: SendEmailHandler;
    let emailService: jest.Mocked<AwsSesLibService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SendEmailHandler,
                {
                    provide: AwsSesLibService,
                    useValue: {
                        sendEmail: jest.fn(),
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

        handler = module.get<SendEmailHandler>(SendEmailHandler);
        emailService = module.get(AwsSesLibService) as jest.Mocked<AwsSesLibService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should send email successfully with all required fields', async () => {
            const command = new SendEmailCommand(
                'sender@example.com', // source
                'recipient@example.com', // toAddress
                '<h1>Hello HTML</h1>', // messageBodyHtmlData
                'Hello Text', // messageBodyTextData
                'Test Subject' // subjectData
            );

            const mockSesResponse = { MessageId: 'mock-message-id' };
            emailService.sendEmail.mockResolvedValue(mockSesResponse);

            const result = await handler.execute(command);

            expect(emailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: 'sender@example.com',
                    toAddress: 'recipient@example.com',
                    messageBodyHtmlData: '<h1>Hello HTML</h1>',
                    messageBodyTextData: 'Hello Text',
                    subjectData: 'Test Subject',
                    files: undefined,
                    replyToAddress: undefined,
                })
            );

            expect(result).toEqual(new ResponseDto<string>('Email sent successfully', 201));
        });

        it('should send email successfully with optional fields', async () => {
            const mockFiles = [{ filename: 'test.pdf', buffer: Buffer.from('test') }];

            const command = new SendEmailCommand(
                'sender@example.com', // source
                'recipient@example.com', // toAddress
                '<h1>Hello HTML</h1>', // messageBodyHtmlData
                'Hello Text', // messageBodyTextData
                'Test Subject', // subjectData
                mockFiles, // files (optional)
                'reply@example.com' // replyToAddress (optional)
            );

            const mockSesResponse = { MessageId: 'mock-message-id-with-attachments' };
            emailService.sendEmail.mockResolvedValue(mockSesResponse);

            const result = await handler.execute(command);

            expect(emailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: 'sender@example.com',
                    toAddress: 'recipient@example.com',
                    messageBodyHtmlData: '<h1>Hello HTML</h1>',
                    messageBodyTextData: 'Hello Text',
                    subjectData: 'Test Subject',
                    files: mockFiles,
                    replyToAddress: 'reply@example.com',
                })
            );

            expect(result).toEqual(new ResponseDto<string>('Email sent successfully', 201));
        });

        it('should create EmailNotificationDto with correct properties', async () => {
            const command = new SendEmailCommand(
                'test@example.com',
                'user@test.com',
                '<p>Test HTML</p>',
                'Test Text',
                'Important Email'
            );

            emailService.sendEmail.mockResolvedValue({ MessageId: 'test-id' });

            await handler.execute(command);

            const expectedDto = new EmailNotificationDto();
            expectedDto.toAddress = 'user@test.com';
            expectedDto.subjectData = 'Important Email';
            expectedDto.replyToAddress = undefined;
            expectedDto.source = 'test@example.com';
            expectedDto.messageBodyHtmlData = '<p>Test HTML</p>';
            expectedDto.messageBodyTextData = 'Test Text';
            expectedDto.files = undefined;

            expect(emailService.sendEmail).toHaveBeenCalledWith(expectedDto);
        });

        it('should handle multiple recipients email', async () => {
            const command = new SendEmailCommand(
                'notifications@company.com',
                'team@example.com',
                '<h2>Team Update</h2><p>Important information</p>',
                'Team Update: Important information',
                'Weekly Team Update'
            );

            emailService.sendEmail.mockResolvedValue({ MessageId: 'team-email-id' });

            const result = await handler.execute(command);

            expect(emailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    toAddress: 'team@example.com',
                    source: 'notifications@company.com',
                    subjectData: 'Weekly Team Update',
                })
            );

            expect(result).toEqual(new ResponseDto<string>('Email sent successfully', 201));
        });

        it('should throw BadRequestException when email service fails', async () => {
            const command = new SendEmailCommand(
                'sender@example.com',
                'invalid-email',
                '<h1>Test</h1>',
                'Test',
                'Test Subject'
            );

            const error = new Error('Invalid email address');
            emailService.sendEmail.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (exception) {
                expect(exception).toBeInstanceOf(BadRequestException);
                expect(exception.getResponse()).toEqual(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid email address' }, 400)
                );
            }

            expect(emailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    toAddress: 'invalid-email',
                })
            );
        });

        it('should handle complex error response structure', async () => {
            const command = new SendEmailCommand(
                'sender@example.com',
                'recipient@example.com',
                '<h1>Test</h1>',
                'Test',
                'Test Subject'
            );

            const error = {
                message: 'SES Error',
                response: {
                    body: {
                        errorMessage: 'Email quota exceeded',
                    },
                },
            };

            emailService.sendEmail.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (exception) {
                expect(exception).toBeInstanceOf(BadRequestException);
                expect(exception.getResponse()).toEqual(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'Email quota exceeded' }, 400)
                );
            }
        });

        it('should handle email with large attachments', async () => {
            const largeFile = {
                filename: 'large-document.pdf',
                buffer: Buffer.alloc(500000), // 500KB
            };

            const command = new SendEmailCommand(
                'documents@company.com',
                'client@external.com',
                '<h1>Document Attached</h1><p>Please find the attached document.</p>',
                'Document Attached - Please find the attached document.',
                'Important Document',
                [largeFile],
                'support@company.com'
            );

            emailService.sendEmail.mockResolvedValue({ MessageId: 'large-attachment-id' });

            const result = await handler.execute(command);

            expect(emailService.sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    files: [largeFile],
                    toAddress: 'client@external.com',
                    replyToAddress: 'support@company.com',
                })
            );

            expect(result).toEqual(new ResponseDto<string>('Email sent successfully', 201));
        });

        it('should handle email service network error', async () => {
            const command = new SendEmailCommand(
                'sender@example.com',
                'recipient@example.com',
                '<h1>Test</h1>',
                'Test',
                'Network Test'
            );

            const networkError = new Error('Network timeout');
            emailService.sendEmail.mockRejectedValue(networkError);

            await expect(handler.execute(command)).rejects.toThrow(BadRequestException);

            expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        });

        it('should log successful email sending', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const command = new SendEmailCommand(
                'sender@example.com',
                'recipient@example.com',
                '<h1>Log Test</h1>',
                'Log Test',
                'Logging Test Subject'
            );

            const mockResponse = { MessageId: 'log-test-id' };
            emailService.sendEmail.mockResolvedValue(mockResponse);

            await handler.execute(command);

            expect(logSpy).toHaveBeenCalledWith(
                'Email delivery request - To: recipient@example.com, Subject: "Logging Test Subject", From: sender@example.com'
            );
            expect(logSpy).toHaveBeenCalledWith(
                'Email delivered successfully - To: recipient@example.com, MessageId: log-test-id'
            );
        });

        it('should log email sending errors', async () => {
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            const command = new SendEmailCommand(
                'sender@example.com',
                'recipient@example.com',
                '<h1>Error Test</h1>',
                'Error Test',
                'Error Test Subject'
            );

            const error = new Error('Email sending failed');
            emailService.sendEmail.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (e) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                `Email delivery failed - To: recipient@example.com, Subject: "Error Test Subject", Error: ${JSON.stringify(
                    error
                )}`
            );
        });
    });
});

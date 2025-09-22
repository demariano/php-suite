import { EmailTemplateDto, EmailTemplateType, ErrorResponseDto, ResponseDto } from '@dto';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEmailTemplateCommand } from './create.email.template.command';
import { CreateEmailTemplateHandler } from './create.email.template.handler';

describe('CreateEmailTemplateHandler', () => {
    let handler: CreateEmailTemplateHandler;
    let emailTemplateDatabaseService: jest.Mocked<EmailTemplateDatabaseService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateEmailTemplateHandler,
                {
                    provide: EmailTemplateDatabaseService,
                    useValue: {
                        createRecord: jest.fn(),
                        convertToDto: jest.fn(),
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

        handler = module.get<CreateEmailTemplateHandler>(CreateEmailTemplateHandler);
        emailTemplateDatabaseService = module.get(
            EmailTemplateDatabaseService
        ) as jest.Mocked<EmailTemplateDatabaseService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should create email template successfully with all fields', async () => {
            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                '<h1>Welcome to our platform!</h1><p>Please confirm your email.</p>',
                'Welcome to our platform! Please confirm your email.',
                'Welcome - Confirm Your Email'
            );

            const mockDatabaseRecord = {
                id: 'template-123',
                subject: 'Welcome - Confirm Your Email',
                data: {
                    htmlData: '<h1>Welcome to our platform!</h1><p>Please confirm your email.</p>',
                    textData: 'Welcome to our platform! Please confirm your email.',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'ENGLISH',
                emailTemplateType: EmailTemplateType.SIGN_UP,
                data: {
                    htmlData: '<h1>Welcome to our platform!</h1><p>Please confirm your email.</p>',
                    textData: 'Welcome to our platform! Please confirm your email.',
                },
                subject: 'Welcome - Confirm Your Email',
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(command);

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalledWith({
                subject: 'Welcome - Confirm Your Email',
                data: {
                    htmlData: '<h1>Welcome to our platform!</h1><p>Please confirm your email.</p>',
                    textData: 'Welcome to our platform! Please confirm your email.',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
            });

            expect(emailTemplateDatabaseService.convertToDto).toHaveBeenCalledWith(mockDatabaseRecord);
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 201));
        });

        it('should create forgot password email template successfully', async () => {
            const command = new CreateEmailTemplateCommand(
                'SPANISH',
                EmailTemplateType.FORGOT_PASSWORD,
                '<h1>Recuperar contraseña</h1><p>Haz clic aquí para restablecer tu contraseña.</p>',
                'Recuperar contraseña - Haz clic aquí para restablecer tu contraseña.',
                'Recuperar tu contraseña'
            );

            const mockDatabaseRecord = {
                id: 'template-456',
                subject: 'Recuperar tu contraseña',
                data: {
                    htmlData: '<h1>Recuperar contraseña</h1><p>Haz clic aquí para restablecer tu contraseña.</p>',
                    textData: 'Recuperar contraseña - Haz clic aquí para restablecer tu contraseña.',
                },
                emailTemplateType: EmailTemplateType.FORGOT_PASSWORD,
                language: 'SPANISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'SPANISH',
                emailTemplateType: EmailTemplateType.FORGOT_PASSWORD,
                data: {
                    htmlData: '<h1>Recuperar contraseña</h1><p>Haz clic aquí para restablecer tu contraseña.</p>',
                    textData: 'Recuperar contraseña - Haz clic aquí para restablecer tu contraseña.',
                },
                subject: 'Recuperar tu contraseña',
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(command);

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalledWith({
                subject: 'Recuperar tu contraseña',
                data: {
                    htmlData: '<h1>Recuperar contraseña</h1><p>Haz clic aquí para restablecer tu contraseña.</p>',
                    textData: 'Recuperar contraseña - Haz clic aquí para restablecer tu contraseña.',
                },
                emailTemplateType: EmailTemplateType.FORGOT_PASSWORD,
                language: 'SPANISH',
            });

            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 201));
        });

        it('should create invitation email template successfully', async () => {
            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.INVITATION,
                '<h1>You have been invited!</h1><p>Click here to join our platform.</p>',
                'You have been invited! Click here to join our platform.',
                'You are invited to join us'
            );

            const mockDatabaseRecord = {
                id: 'template-789',
                subject: 'You are invited to join us',
                data: {
                    htmlData: '<h1>You have been invited!</h1><p>Click here to join our platform.</p>',
                    textData: 'You have been invited! Click here to join our platform.',
                },
                emailTemplateType: EmailTemplateType.INVITATION,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'ENGLISH',
                emailTemplateType: EmailTemplateType.INVITATION,
                data: {
                    htmlData: '<h1>You have been invited!</h1><p>Click here to join our platform.</p>',
                    textData: 'You have been invited! Click here to join our platform.',
                },
                subject: 'You are invited to join us',
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(command);

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalledWith({
                subject: 'You are invited to join us',
                data: {
                    htmlData: '<h1>You have been invited!</h1><p>Click here to join our platform.</p>',
                    textData: 'You have been invited! Click here to join our platform.',
                },
                emailTemplateType: EmailTemplateType.INVITATION,
                language: 'ENGLISH',
            });

            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 201));
        });

        it('should handle complex HTML templates with multiple elements', async () => {
            const complexHtml = `
                <div style="font-family: Arial, sans-serif;">
                    <header>
                        <img src="logo.png" alt="Company Logo" />
                        <h1>Welcome to Our Service</h1>
                    </header>
                    <main>
                        <p>Dear User,</p>
                        <p>Thank you for signing up. Please click the button below to confirm your email address.</p>
                        <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none;">Confirm Email</a>
                    </main>
                    <footer>
                        <p>Best regards,<br>The Team</p>
                    </footer>
                </div>
            `;

            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                complexHtml,
                'Dear User, Thank you for signing up. Please click the link to confirm your email address. Best regards, The Team',
                'Complete Your Registration'
            );

            const mockDatabaseRecord = {
                id: 'template-complex',
                subject: 'Complete Your Registration',
                data: {
                    htmlData: complexHtml,
                    textData:
                        'Dear User, Thank you for signing up. Please click the link to confirm your email address. Best regards, The Team',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'ENGLISH',
                emailTemplateType: EmailTemplateType.SIGN_UP,
                data: {
                    htmlData: complexHtml,
                    textData:
                        'Dear User, Thank you for signing up. Please click the link to confirm your email address. Best regards, The Team',
                },
                subject: 'Complete Your Registration',
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(command);

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalledWith({
                subject: 'Complete Your Registration',
                data: {
                    htmlData: complexHtml,
                    textData:
                        'Dear User, Thank you for signing up. Please click the link to confirm your email address. Best regards, The Team',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
            });

            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 201));
        });

        it('should throw BadRequestException when database creation fails', async () => {
            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                '<h1>Test</h1>',
                'Test',
                'Test Subject'
            );

            const error = new Error('Database connection failed');
            emailTemplateDatabaseService.createRecord.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (exception) {
                expect(exception).toBeInstanceOf(BadRequestException);
                expect(exception.getResponse()).toEqual(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'Database connection failed' }, 400)
                );
            }

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalledWith({
                subject: 'Test Subject',
                data: {
                    htmlData: '<h1>Test</h1>',
                    textData: 'Test',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
            });
        });

        it('should handle complex error response structure', async () => {
            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.FORGOT_PASSWORD,
                '<h1>Reset Password</h1>',
                'Reset Password',
                'Reset Your Password'
            );

            const error = {
                message: 'Validation Error',
                response: {
                    body: {
                        errorMessage: 'Invalid email template type',
                    },
                },
            };

            emailTemplateDatabaseService.createRecord.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (exception) {
                expect(exception).toBeInstanceOf(BadRequestException);
                expect(exception.getResponse()).toEqual(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'Invalid email template type' }, 400)
                );
            }
        });

        it('should handle DTO conversion failure', async () => {
            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                '<h1>Welcome</h1>',
                'Welcome',
                'Welcome Subject'
            );

            const mockDatabaseRecord = {
                id: 'template-dto-fail',
                subject: 'Welcome Subject',
                data: {
                    htmlData: '<h1>Welcome</h1>',
                    textData: 'Welcome',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockRejectedValue(new Error('DTO conversion failed'));

            try {
                await handler.execute(command);
            } catch (exception) {
                expect(exception).toBeInstanceOf(BadRequestException);
                expect(exception.getResponse()).toEqual(
                    new ResponseDto<ErrorResponseDto>({ errorMessage: 'DTO conversion failed' }, 400)
                );
            }

            expect(emailTemplateDatabaseService.createRecord).toHaveBeenCalled();
            expect(emailTemplateDatabaseService.convertToDto).toHaveBeenCalledWith(mockDatabaseRecord);
        });

        it('should log successful email template creation', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                '<h1>Log Test</h1>',
                'Log Test',
                'Logging Test Subject'
            );

            const mockDatabaseRecord = {
                id: 'template-log-test',
                subject: 'Logging Test Subject',
                data: {
                    htmlData: '<h1>Log Test</h1>',
                    textData: 'Log Test',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'ENGLISH',
                emailTemplateType: EmailTemplateType.SIGN_UP,
                data: {
                    htmlData: '<h1>Log Test</h1>',
                    textData: 'Log Test',
                },
                subject: 'Logging Test Subject',
            };

            emailTemplateDatabaseService.createRecord.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            await handler.execute(command);

            expect(logSpy).toHaveBeenCalledWith(
                'Email template creation request - Type: SIGN_UP, Language: ENGLISH, Subject: "Logging Test Subject"'
            );
            expect(logSpy).toHaveBeenCalledWith(
                'Email template created successfully - Type: SIGN_UP, Language: ENGLISH, ID: N/A'
            );
        });

        it('should log email template creation errors', async () => {
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            const command = new CreateEmailTemplateCommand(
                'ENGLISH',
                EmailTemplateType.SIGN_UP,
                '<h1>Error Test</h1>',
                'Error Test',
                'Error Test Subject'
            );

            const error = new Error('Template creation failed');
            emailTemplateDatabaseService.createRecord.mockRejectedValue(error);

            try {
                await handler.execute(command);
            } catch (e) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                `Email template creation failed - Type: SIGN_UP, Language: ENGLISH, Error: ${JSON.stringify(error)}`
            );
        });
    });
});

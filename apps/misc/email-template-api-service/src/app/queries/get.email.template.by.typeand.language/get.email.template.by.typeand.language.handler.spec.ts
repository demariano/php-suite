import { EmailTemplateDto, EmailTemplateType, ResponseDto } from '@dto';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetEmailTemplateByTypeAndLanguageHandler } from './get.email.template.by.typeand.language.handler';
import { GetEmailTemplateByTypeAndLanguageQuery } from './get.email.template.by.typeand.language.query';

describe('GetEmailTemplateByTypeAndLanguageHandler', () => {
    let handler: GetEmailTemplateByTypeAndLanguageHandler;
    let emailTemplateDatabaseService: jest.Mocked<EmailTemplateDatabaseService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetEmailTemplateByTypeAndLanguageHandler,
                {
                    provide: EmailTemplateDatabaseService,
                    useValue: {
                        findByTemplateTypeAndLanguage: jest.fn(),
                        convertToDto: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<GetEmailTemplateByTypeAndLanguageHandler>(GetEmailTemplateByTypeAndLanguageHandler);
        emailTemplateDatabaseService = module.get(
            EmailTemplateDatabaseService
        ) as jest.Mocked<EmailTemplateDatabaseService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should retrieve sign up email template successfully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'ENGLISH');

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

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.SIGN_UP,
                'ENGLISH'
            );
            expect(emailTemplateDatabaseService.convertToDto).toHaveBeenCalledWith(mockDatabaseRecord);
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should retrieve forgot password email template successfully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('FORGOT_PASSWORD', 'SPANISH');

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

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.FORGOT_PASSWORD,
                'SPANISH'
            );
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should retrieve invitation email template successfully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('INVITATION', 'ENGLISH');

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

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.INVITATION,
                'ENGLISH'
            );
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should handle complex HTML templates retrieval', async () => {
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

            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'ENGLISH');

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

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.SIGN_UP,
                'ENGLISH'
            );
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should handle multilingual template retrieval', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'FRENCH');

            const mockDatabaseRecord = {
                id: 'template-french',
                subject: 'Bienvenue - Confirmez votre email',
                data: {
                    htmlData: '<h1>Bienvenue sur notre plateforme!</h1><p>Veuillez confirmer votre email.</p>',
                    textData: 'Bienvenue sur notre plateforme! Veuillez confirmer votre email.',
                },
                emailTemplateType: EmailTemplateType.SIGN_UP,
                language: 'FRENCH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'FRENCH',
                emailTemplateType: EmailTemplateType.SIGN_UP,
                data: {
                    htmlData: '<h1>Bienvenue sur notre plateforme!</h1><p>Veuillez confirmer votre email.</p>',
                    textData: 'Bienvenue sur notre plateforme! Veuillez confirmer votre email.',
                },
                subject: 'Bienvenue - Confirmez votre email',
            };

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.SIGN_UP,
                'FRENCH'
            );
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should handle different email template types correctly', async () => {
            const templateTypes = [
                { type: 'SIGN_UP', enum: EmailTemplateType.SIGN_UP },
                { type: 'FORGOT_PASSWORD', enum: EmailTemplateType.FORGOT_PASSWORD },
                { type: 'INVITATION', enum: EmailTemplateType.INVITATION },
            ];

            for (const templateType of templateTypes) {
                const query = new GetEmailTemplateByTypeAndLanguageQuery(templateType.type, 'ENGLISH');

                const mockDatabaseRecord = {
                    id: `template-${templateType.type.toLowerCase()}`,
                    subject: `Subject for ${templateType.type}`,
                    data: {
                        htmlData: `<h1>HTML for ${templateType.type}</h1>`,
                        textData: `Text for ${templateType.type}`,
                    },
                    emailTemplateType: templateType.enum,
                    language: 'ENGLISH',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const mockDto: EmailTemplateDto = {
                    language: 'ENGLISH',
                    emailTemplateType: templateType.enum,
                    data: {
                        htmlData: `<h1>HTML for ${templateType.type}</h1>`,
                        textData: `Text for ${templateType.type}`,
                    },
                    subject: `Subject for ${templateType.type}`,
                };

                emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
                emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

                const result = await handler.execute(query);

                expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                    templateType.enum,
                    'ENGLISH'
                );
                expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));

                // Clear mocks for next iteration
                jest.clearAllMocks();
            }
        });

        it('should handle database service errors gracefully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'ENGLISH');

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockRejectedValue(
                new Error('Database connection failed')
            );

            await expect(handler.execute(query)).rejects.toThrow('Database connection failed');

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.SIGN_UP,
                'ENGLISH'
            );
        });

        it('should handle DTO conversion errors gracefully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('FORGOT_PASSWORD', 'ENGLISH');

            const mockDatabaseRecord = {
                id: 'template-dto-error',
                subject: 'Reset Password',
                data: {
                    htmlData: '<h1>Reset Password</h1>',
                    textData: 'Reset Password',
                },
                emailTemplateType: EmailTemplateType.FORGOT_PASSWORD,
                language: 'ENGLISH',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockRejectedValue(new Error('DTO conversion failed'));

            await expect(handler.execute(query)).rejects.toThrow('DTO conversion failed');

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                EmailTemplateType.FORGOT_PASSWORD,
                'ENGLISH'
            );
            expect(emailTemplateDatabaseService.convertToDto).toHaveBeenCalledWith(mockDatabaseRecord);
        });

        it('should log query execution correctly', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'ENGLISH');

            const mockDatabaseRecord = {
                id: 'template-log-test',
                subject: 'Log Test Subject',
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
                subject: 'Log Test Subject',
            };

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            await handler.execute(query);

            expect(logSpy).toHaveBeenCalledWith('Email template retrieval request - Type: SIGN_UP, Language: ENGLISH');
        });

        it('should handle case-sensitive template type lookup', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('sign_up', 'english');

            const mockDatabaseRecord = {
                id: 'template-case-test',
                subject: 'Case Test Subject',
                data: {
                    htmlData: '<h1>Case Test</h1>',
                    textData: 'Case Test',
                },
                emailTemplateType: 'sign_up' as EmailTemplateType,
                language: 'english',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockDto: EmailTemplateDto = {
                language: 'english',
                emailTemplateType: 'sign_up' as EmailTemplateType,
                data: {
                    htmlData: '<h1>Case Test</h1>',
                    textData: 'Case Test',
                },
                subject: 'Case Test Subject',
            };

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
                'sign_up' as EmailTemplateType,
                'english'
            );
            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });

        it('should handle empty template data gracefully', async () => {
            const query = new GetEmailTemplateByTypeAndLanguageQuery('SIGN_UP', 'ENGLISH');

            const mockDatabaseRecord = {
                id: 'template-empty',
                subject: '',
                data: {
                    htmlData: '',
                    textData: '',
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
                    htmlData: '',
                    textData: '',
                },
                subject: '',
            };

            emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockDatabaseRecord);
            emailTemplateDatabaseService.convertToDto.mockResolvedValue(mockDto);

            const result = await handler.execute(query);

            expect(result).toEqual(new ResponseDto<EmailTemplateDto>(mockDto, 200));
        });
    });
});

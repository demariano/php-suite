import { EmailTemplateDto, EmailTemplateType } from '@dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CreateEmailTemplateCommand } from './commands/create.email.template/create.email.template.command';
import { GetEmailTemplateByTypeAndLanguageQuery } from './queries/get.email.template.by.typeand.language/get.email.template.by.typeand.language.query';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;
  let queryBus: jest.Mocked<QueryBus>;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            healthCheck: jest.fn(),
            getVersion: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService) as jest.Mocked<AppService>;
    queryBus = module.get(QueryBus) as jest.Mocked<QueryBus>;
    commandBus = module.get(CommandBus) as jest.Mocked<CommandBus>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return health check data', () => {
      const expectedResult = {
        status: 'ok',
        version: '1.0.0'
      };

      appService.healthCheck.mockReturnValue(expectedResult);

      const result = controller.healthCheck();

      expect(appService.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getVersion', () => {
    it('should return version data', () => {
      const expectedResult = {
        version: '1.0.0'
      };

      appService.getVersion.mockReturnValue(expectedResult);

      const result = controller.getVersion();

      expect(appService.getVersion).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getEmailTemplate', () => {
    it('should execute query with correct parameters', async () => {
      const emailTemplateType = 'SIGN_UP';
      const language = 'ENGLISH';
      const expectedResult = { data: 'template data' };

      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getEmailTemplate(emailTemplateType, language);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetEmailTemplateByTypeAndLanguageQuery(emailTemplateType, language)
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle different template types', async () => {
      const emailTemplateType = 'FORGOT_PASSWORD';
      const language = 'SPANISH';
      const expectedResult = { data: 'spanish template' };

      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.getEmailTemplate(emailTemplateType, language);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetEmailTemplateByTypeAndLanguageQuery(emailTemplateType, language)
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createEmailTemplate', () => {
    it('should execute command with correct email template data', async () => {
      const emailTemplateDto: EmailTemplateDto = {
        language: 'ENGLISH',
        emailTemplateType: EmailTemplateType.SIGN_UP,
        data: {
          htmlData: '<h1>Welcome</h1>',
          textData: 'Welcome'
        },
        subject: 'Welcome to our platform'
      };

      const expectedResult = { message: 'Template created successfully' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createEmailTemplate(emailTemplateDto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateEmailTemplateCommand(
          emailTemplateDto.language,
          emailTemplateDto.emailTemplateType,
          emailTemplateDto.data.htmlData,
          emailTemplateDto.data.textData,
          emailTemplateDto.subject
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle forgot password template creation', async () => {
      const emailTemplateDto: EmailTemplateDto = {
        language: 'SPANISH',
        emailTemplateType: EmailTemplateType.FORGOT_PASSWORD,
        data: {
          htmlData: '<h1>Recuperar contraseña</h1>',
          textData: 'Recuperar contraseña'
        },
        subject: 'Recuperar tu contraseña'
      };

      const expectedResult = { message: 'Spanish template created' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.createEmailTemplate(emailTemplateDto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateEmailTemplateCommand(
          emailTemplateDto.language,
          emailTemplateDto.emailTemplateType,
          emailTemplateDto.data.htmlData,
          emailTemplateDto.data.textData,
          emailTemplateDto.subject
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should pass through command bus errors', async () => {
      const emailTemplateDto: EmailTemplateDto = {
        language: 'ENGLISH',
        emailTemplateType: EmailTemplateType.SIGN_UP,
        data: {
          htmlData: '<h1>Invalid</h1>',
          textData: 'Invalid'
        },
        subject: 'Invalid Template'
      };

      const error = new Error('Template creation failed');
      commandBus.execute.mockRejectedValue(error);

      await expect(controller.createEmailTemplate(emailTemplateDto)).rejects.toThrow('Template creation failed');

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateEmailTemplateCommand(
          emailTemplateDto.language,
          emailTemplateDto.emailTemplateType,
          emailTemplateDto.data.htmlData,
          emailTemplateDto.data.textData,
          emailTemplateDto.subject
        )
      );
    });
  });
});

import { EmailNotificationDto } from '@dto';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SendEmailCommand } from './commands/send.email/send.email.command';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;
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
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService) as jest.Mocked<AppService>;
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

  describe('sendEmail', () => {
    it('should send email with required fields only', async () => {
      const emailDto: EmailNotificationDto = {
        toAddress: 'recipient@example.com',
        source: 'sender@example.com',
        messageBodyHtmlData: '<h1>Test Email</h1>',
        messageBodyTextData: 'Test Email',
        subjectData: 'Test Subject',
        files: []
      };

      const files: Array<any> = [];
      const expectedResult = { message: 'Email sent successfully' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(emailDto, files);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          emailDto.toAddress,
          emailDto.source,
          emailDto.messageBodyHtmlData,
          emailDto.messageBodyTextData,
          emailDto.subjectData,
          files,
          emailDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should send email with all fields including optional ones', async () => {
      const emailDto: EmailNotificationDto = {
        toAddress: 'recipient@example.com',
        source: 'sender@example.com',
        messageBodyHtmlData: '<h1>Complete Email</h1>',
        messageBodyTextData: 'Complete Email',
        subjectData: 'Complete Subject',
        replyToAddress: 'reply@example.com',
        files: []
      };

      const mockFiles = [
        { filename: 'attachment.pdf', buffer: Buffer.from('test') }
      ];

      const expectedResult = { message: 'Email sent successfully with attachments' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(emailDto, mockFiles);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          emailDto.toAddress,
          emailDto.source,
          emailDto.messageBodyHtmlData,
          emailDto.messageBodyTextData,
          emailDto.subjectData,
          mockFiles,
          emailDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle email with multiple attachments', async () => {
      const emailDto: EmailNotificationDto = {
        toAddress: 'client@company.com',
        source: 'documents@company.com',
        messageBodyHtmlData: '<h1>Documents Attached</h1><p>Please review the attached documents.</p>',
        messageBodyTextData: 'Documents Attached - Please review the attached documents.',
        subjectData: 'Document Package',
        files: []
      };

      const multipleFiles = [
        { filename: 'document1.pdf', buffer: Buffer.from('doc1') },
        { filename: 'document2.docx', buffer: Buffer.from('doc2') },
        { filename: 'spreadsheet.xlsx', buffer: Buffer.from('sheet') }
      ];

      const expectedResult = { message: 'Email sent with multiple attachments' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(emailDto, multipleFiles);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          emailDto.toAddress,
          emailDto.source,
          emailDto.messageBodyHtmlData,
          emailDto.messageBodyTextData,
          emailDto.subjectData,
          multipleFiles,
          emailDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle business email scenario', async () => {
      const businessEmailDto: EmailNotificationDto = {
        toAddress: 'customer@business.com',
        source: 'noreply@company.com',
        messageBodyHtmlData: '<div><h2>Invoice #12345</h2><p>Thank you for your business.</p></div>',
        messageBodyTextData: 'Invoice #12345 - Thank you for your business.',
        subjectData: 'Invoice #12345 - Payment Confirmation',
        replyToAddress: 'support@company.com',
        files: []
      };

      const invoiceFiles = [
        { filename: 'invoice-12345.pdf', buffer: Buffer.from('invoice') }
      ];

      const expectedResult = { message: 'Invoice email sent successfully' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(businessEmailDto, invoiceFiles);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          businessEmailDto.toAddress,
          businessEmailDto.source,
          businessEmailDto.messageBodyHtmlData,
          businessEmailDto.messageBodyTextData,
          businessEmailDto.subjectData,
          invoiceFiles,
          businessEmailDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle newsletter email scenario', async () => {
      const newsletterDto: EmailNotificationDto = {
        toAddress: 'subscriber@email.com',
        source: 'newsletter@company.com',
        messageBodyHtmlData: '<h1>Weekly Newsletter</h1><p>This week in tech...</p>',
        messageBodyTextData: 'Weekly Newsletter - This week in tech...',
        subjectData: 'Weekly Tech Newsletter - Issue #42',
        files: []
      };

      const expectedResult = { message: 'Newsletter sent successfully' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(newsletterDto, []);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          newsletterDto.toAddress,
          newsletterDto.source,
          newsletterDto.messageBodyHtmlData,
          newsletterDto.messageBodyTextData,
          newsletterDto.subjectData,
          [],
          newsletterDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });

    it('should pass through command bus errors', async () => {
      const emailDto: EmailNotificationDto = {
        toAddress: 'invalid@email',
        source: 'sender@example.com',
        messageBodyHtmlData: '<h1>Error Test</h1>',
        messageBodyTextData: 'Error Test',
        subjectData: 'Error Subject',
        files: []
      };

      const error = new Error('Email validation failed');
      commandBus.execute.mockRejectedValue(error);

      await expect(controller.sendEmail(emailDto, [])).rejects.toThrow('Email validation failed');

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          emailDto.toAddress,
          emailDto.source,
          emailDto.messageBodyHtmlData,
          emailDto.messageBodyTextData,
          emailDto.subjectData,
          [],
          emailDto.replyToAddress
        )
      );
    });

    it('should handle empty files array correctly', async () => {
      const emailDto: EmailNotificationDto = {
        toAddress: 'test@example.com',
        source: 'sender@example.com',
        messageBodyHtmlData: '<p>No attachments</p>',
        messageBodyTextData: 'No attachments',
        subjectData: 'Simple Email',
        files: []
      };

      const expectedResult = { message: 'Simple email sent' };

      commandBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.sendEmail(emailDto, []);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendEmailCommand(
          emailDto.toAddress,
          emailDto.source,
          emailDto.messageBodyHtmlData,
          emailDto.messageBodyTextData,
          emailDto.subjectData,
          [],
          emailDto.replyToAddress
        )
      );
      expect(result).toEqual(expectedResult);
    });
  });
});

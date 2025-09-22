import { EmailTemplateType } from '@dto';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let emailTemplateDatabaseService: jest.Mocked<EmailTemplateDatabaseService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: EmailTemplateDatabaseService,
          useValue: {
            findByTemplateTypeAndLanguage: jest.fn(),
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

    service = module.get<AppService>(AppService);
    emailTemplateDatabaseService = module.get(EmailTemplateDatabaseService) as jest.Mocked<EmailTemplateDatabaseService>;

    // Mock the logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmailFromEvent', () => {
    it('should extract email from event user attributes', async () => {
      const mockEvent = {
        request: {
          userAttributes: {
            email: 'test@example.com'
          }
        }
      };

      const result = await service.getEmailFromEvent(mockEvent);

      expect(result).toBe('test@example.com');
    });
  });

  describe('handleMessage', () => {
    const mockEvent = {
      request: {
        userAttributes: {
          email: 'test@example.com'
        }
      },
      response: {
        emailSubject: '',
        emailMessage: ''
      }
    };

    it('should handle CustomMessage_SignUp trigger', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_SignUp' 
      };
      
      const mockTemplate = {
        subject: 'Welcome! Confirm your account',
        data: { htmlData: '<h1>Welcome</h1>' }
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockTemplate);

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
        EmailTemplateType.SIGN_UP,
        'ENGLISH'
      );
      expect(result.response.emailSubject).toBe('Welcome! Confirm your account');
      expect(result.response.emailMessage).toBe('<h1>Welcome</h1>');
    });

    it('should handle CustomMessage_ResendCode trigger', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_ResendCode' 
      };
      
      const mockTemplate = {
        subject: 'Resend Code',
        data: { htmlData: '<h1>Resend</h1>' }
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockTemplate);

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
        EmailTemplateType.SIGN_UP,
        'ENGLISH'
      );
      expect(result.response.emailSubject).toBe('Resend Code');
    });

    it('should handle CustomMessage_ForgotPassword trigger', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_ForgotPassword' 
      };
      
      const mockTemplate = {
        subject: 'Reset your password',
        data: { htmlData: '<h1>Reset Password</h1>' }
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockTemplate);

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
        EmailTemplateType.FORGOT_PASSWORD,
        'ENGLISH'
      );
      expect(result.response.emailSubject).toBe('Reset your password');
      expect(result.response.emailMessage).toBe('<h1>Reset Password</h1>');
    });

    it('should handle CustomMessage_AdminCreateUser trigger', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_AdminCreateUser' 
      };
      
      const mockTemplate = {
        subject: 'You have been invited',
        data: { htmlData: '<h1>Invitation</h1>' }
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockTemplate);

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
        EmailTemplateType.INVITATION,
        'ENGLISH'
      );
      expect(result.response.emailSubject).toBe('You have been invited');
      expect(result.response.emailMessage).toBe('<h1>Invitation</h1>');
    });

    it('should handle CustomMessage_ResendInvitation trigger', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_ResendInvitation' 
      };
      
      const mockTemplate = {
        subject: 'Invitation reminder',
        data: { htmlData: '<h1>Invitation Reminder</h1>' }
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(mockTemplate);

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).toHaveBeenCalledWith(
        EmailTemplateType.INVITATION,
        'ENGLISH'
      );
      expect(result.response.emailSubject).toBe('Invitation reminder');
    });

    it('should handle unknown trigger source gracefully', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'UnknownTrigger' 
      };

      const result = await service.handleMessage(event);

      expect(emailTemplateDatabaseService.findByTemplateTypeAndLanguage).not.toHaveBeenCalled();
      expect(result).toEqual(event);
    });

    it('should handle missing email template gracefully for sign up', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_SignUp' 
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(null);

      const result = await service.handleMessage(event);

      expect(result).toEqual(event);
    });

    it('should handle missing email template gracefully for forgot password', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_ForgotPassword' 
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(null);

      const result = await service.handleMessage(event);

      expect(result).toEqual(event);
    });

    it('should handle missing email template gracefully for invitation', async () => {
      const event = { 
        ...mockEvent, 
        triggerSource: 'CustomMessage_AdminCreateUser' 
      };

      emailTemplateDatabaseService.findByTemplateTypeAndLanguage.mockResolvedValue(null);

      const result = await service.handleMessage(event);

      expect(result).toEqual(event);
    });
  });
});

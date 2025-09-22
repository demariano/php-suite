import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            handleMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService) as jest.Mocked<AppService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should handle cognito custom message events', async () => {
      const mockEvent = {
        triggerSource: 'CustomMessage_SignUp',
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

      const expectedResult = {
        ...mockEvent,
        response: {
          emailSubject: 'Welcome! Confirm your account',
          emailMessage: '<h1>Welcome</h1>'
        }
      };

      appService.handleMessage.mockResolvedValue(expectedResult);

      const result = await controller.handleMessage(mockEvent);

      expect(appService.handleMessage).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(expectedResult);
    });

    it('should handle forgot password events', async () => {
      const mockEvent = {
        triggerSource: 'CustomMessage_ForgotPassword',
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

      const expectedResult = {
        ...mockEvent,
        response: {
          emailSubject: 'Reset your password',
          emailMessage: '<h1>Reset Password</h1>'
        }
      };

      appService.handleMessage.mockResolvedValue(expectedResult);

      const result = await controller.handleMessage(mockEvent);

      expect(appService.handleMessage).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(expectedResult);
    });

    it('should handle admin create user events', async () => {
      const mockEvent = {
        triggerSource: 'CustomMessage_AdminCreateUser',
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

      const expectedResult = {
        ...mockEvent,
        response: {
          emailSubject: 'You have been invited',
          emailMessage: '<h1>Invitation</h1>'
        }
      };

      appService.handleMessage.mockResolvedValue(expectedResult);

      const result = await controller.handleMessage(mockEvent);

      expect(appService.handleMessage).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(expectedResult);
    });

    it('should handle unknown trigger source', async () => {
      const mockEvent = {
        triggerSource: 'UnknownTrigger',
        request: {
          userAttributes: {
            email: 'test@example.com'
          }
        }
      };

      appService.handleMessage.mockResolvedValue(mockEvent);

      const result = await controller.handleMessage(mockEvent);

      expect(appService.handleMessage).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });
  });
});

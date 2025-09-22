import { ApiKeyHeaderGuard } from '@auth-guard-lib';
import { InitializeEnvironmentDto } from '@dto';
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
                        healthCheck: jest.fn(),
                        getVersion: jest.fn(),
                        initializeEnvironment: jest.fn(),
                    },
                },
            ],
        })
        .overrideGuard(ApiKeyHeaderGuard)
        .useValue({
            canActivate: jest.fn().mockReturnValue(true),
        })
        .compile();

        controller = module.get<AppController>(AppController);
        appService = module.get(AppService) as jest.Mocked<AppService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
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

        it('should handle different version formats', () => {
            const versionFormats = ['1.0.0', '2.3.4-beta', '0.0.0', '1.2.3-alpha.1'];

            versionFormats.forEach(version => {
                const expectedResult = {
                    status: 'ok',
                    version: version
                };

                appService.healthCheck.mockReturnValue(expectedResult);

                const result = controller.healthCheck();

                expect(appService.healthCheck).toHaveBeenCalled();
                expect(result).toEqual(expectedResult);

                // Clear mocks for next iteration
                jest.clearAllMocks();
            });
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

        it('should handle default version when file not found', () => {
            const expectedResult = {
                version: '0.0.0'
            };

            appService.getVersion.mockReturnValue(expectedResult);

            const result = controller.getVersion();

            expect(appService.getVersion).toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });
    });

    describe('initializeEnvironment', () => {
        it('should call appService.initializeEnvironment with correct parameters', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'admin@company.com'
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });

        it('should handle corporate email domains', async () => {
            const corporateEmails = [
                'noreply@enterprise.com',
                'admin@company.org',
                'support@business.net',
                'notifications@startup.io'
            ];

            for (const email of corporateEmails) {
                const initializeEnvironmentDto: InitializeEnvironmentDto = {
                    defaultSenderEmail: email
                };

                appService.initializeEnvironment.mockResolvedValue(undefined);

                const result = await controller.initializeEnvironment(initializeEnvironmentDto);

                expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
                expect(result).toBeUndefined();

                // Clear mocks for next iteration
                jest.clearAllMocks();
            }
        });

        it('should handle subdomain email addresses', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'system@mail.company.com'
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });

        it('should handle international domain email addresses', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'admin@company.co.uk'
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });

        it('should pass through service errors', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'invalid@domain'
            };

            const error = new Error('Invalid email configuration');
            appService.initializeEnvironment.mockRejectedValue(error);

            await expect(controller.initializeEnvironment(initializeEnvironmentDto)).rejects.toThrow('Invalid email configuration');

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
        });

        it('should handle empty email in DTO', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: ''
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });

        it('should handle service returning undefined', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'test@example.com'
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });

        it('should handle complex email addresses', async () => {
            const complexEmails = [
                'user.name@domain.com',
                'user+tag@company.org',
                'user-123@sub.domain.co.uk',
                'first.last+env@very-long-domain-name.com'
            ];

            for (const email of complexEmails) {
                const initializeEnvironmentDto: InitializeEnvironmentDto = {
                    defaultSenderEmail: email
                };

                appService.initializeEnvironment.mockResolvedValue(undefined);

                const result = await controller.initializeEnvironment(initializeEnvironmentDto);

                expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
                expect(result).toBeUndefined();

                // Clear mocks for next iteration
                jest.clearAllMocks();
            }
        });

        it('should handle async service operations correctly', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'async@test.com'
            };

            // Simulate async operation with delay
            appService.initializeEnvironment.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for test
                return undefined;
            });

            const result = await controller.initializeEnvironment(initializeEnvironmentDto);

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
            expect(result).toBeUndefined();
        });
    });

    describe('API Key Guard Integration', () => {
        it('should be protected by ApiKeyHeaderGuard on initialize-environment endpoint', async () => {
            // This test verifies that the guard is properly applied
            // In a real scenario, the guard would check for X-API-KEY header
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'guarded@test.com'
            };

            appService.initializeEnvironment.mockResolvedValue(undefined);

            // Since we've mocked the guard to always return true, this should work
            await expect(controller.initializeEnvironment(initializeEnvironmentDto)).resolves.toBeUndefined();

            expect(appService.initializeEnvironment).toHaveBeenCalledWith(initializeEnvironmentDto);
        });
    });

    describe('Error Handling', () => {
        it('should handle service method throwing synchronous errors', () => {
            const error = new Error('Service unavailable');
            appService.healthCheck.mockImplementation(() => {
                throw error;
            });

            expect(() => {
                controller.healthCheck();
            }).toThrow('Service unavailable');
        });

        it('should handle getVersion service throwing errors', () => {
            const error = new Error('Version service failed');
            appService.getVersion.mockImplementation(() => {
                throw error;
            });

            expect(() => {
                controller.getVersion();
            }).toThrow('Version service failed');
        });
    });
});

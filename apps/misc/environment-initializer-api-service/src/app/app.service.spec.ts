import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, InitializeEnvironmentDto } from '@dto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;
    let configurationDatabaseService: jest.Mocked<ConfigurationDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: 'ConfigurationDatabaseService',
                    useValue: {
                        createRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AppService>(AppService);
        configurationDatabaseService = module.get('ConfigurationDatabaseService') as jest.Mocked<ConfigurationDatabaseServiceAbstract>;

        // Mock console.error to avoid noise in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('healthCheck', () => {
        it('should return health check data with status and version', () => {
            const result = service.healthCheck();
            expect(result).toHaveProperty('status', 'ok');
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });
    });

    describe('getVersion', () => {
        it('should return version data', () => {
            const result = service.getVersion();
            expect(result).toHaveProperty('version');
            expect(typeof result.version).toBe('string');
        });

        it('should return "0.0.0" when version file is not found', () => {
            const result = service.getVersion();
            // Since version.dat doesn't exist in test environment, it should default to '0.0.0'
            expect(result.version).toBe('0.0.0');
        });
    });

    describe('initializeEnvironment', () => {
        it('should create default sender email configuration successfully', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'test@company.com'
            };

            const expectedConfigurationDto = new ConfigurationDto();
            expectedConfigurationDto.configurationName = 'DEFAULT_SENDER_EMAIL';
            expectedConfigurationDto.configurationValue = 'test@company.com';

            const mockConfigDto = new ConfigurationDto();
            mockConfigDto.configurationName = 'DEFAULT_SENDER_EMAIL';
            mockConfigDto.configurationValue = 'test@company.com';
            
            configurationDatabaseService.createRecord.mockResolvedValue(mockConfigDto);

            await service.initializeEnvironment(initializeEnvironmentDto);

            expect(configurationDatabaseService.createRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    configurationName: 'DEFAULT_SENDER_EMAIL',
                    configurationValue: 'test@company.com'
                })
            );
        });

        it('should handle different email formats', async () => {
            const emailFormats = [
                'admin@example.com',
                'support@company.org',
                'noreply@service.net',
                'notifications@platform.io'
            ];

            for (const email of emailFormats) {
                const initializeEnvironmentDto: InitializeEnvironmentDto = {
                    defaultSenderEmail: email
                };

                const mockConfigDto = new ConfigurationDto();
                mockConfigDto.configurationName = 'DEFAULT_SENDER_EMAIL';
                mockConfigDto.configurationValue = email;
                
                configurationDatabaseService.createRecord.mockResolvedValue(mockConfigDto);

                await service.initializeEnvironment(initializeEnvironmentDto);

                expect(configurationDatabaseService.createRecord).toHaveBeenCalledWith(
                    expect.objectContaining({
                        configurationName: 'DEFAULT_SENDER_EMAIL',
                        configurationValue: email
                    })
                );

                // Clear mocks for next iteration
                jest.clearAllMocks();
            }
        });

        it('should handle database creation errors gracefully', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'test@company.com'
            };

            const error = new Error('Database connection failed');
            configurationDatabaseService.createRecord.mockRejectedValue(error);

            const consoleSpy = jest.spyOn(console, 'error');

            // Should not throw, but handle error gracefully
            await expect(service.initializeEnvironment(initializeEnvironmentDto)).resolves.toBeUndefined();

            expect(configurationDatabaseService.createRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    configurationName: 'DEFAULT_SENDER_EMAIL',
                    configurationValue: 'test@company.com'
                })
            );

            expect(consoleSpy).toHaveBeenCalledWith('Failed to create configuration record:', error);
        });

        it('should handle complex domain names', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'admin@very-long-company-name.co.uk'
            };

            const mockConfigDto = new ConfigurationDto();
            mockConfigDto.configurationName = 'DEFAULT_SENDER_EMAIL';
            mockConfigDto.configurationValue = 'admin@very-long-company-name.co.uk';
            
            configurationDatabaseService.createRecord.mockResolvedValue(mockConfigDto);

            await service.initializeEnvironment(initializeEnvironmentDto);

            expect(configurationDatabaseService.createRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    configurationName: 'DEFAULT_SENDER_EMAIL',
                    configurationValue: 'admin@very-long-company-name.co.uk'
                })
            );
        });

        it('should create ConfigurationDto with correct structure', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'structure@test.com'
            };

            const mockConfigDto = new ConfigurationDto();
            mockConfigDto.configurationName = 'DEFAULT_SENDER_EMAIL';
            mockConfigDto.configurationValue = 'structure@test.com';
            
            configurationDatabaseService.createRecord.mockResolvedValue(mockConfigDto);

            await service.initializeEnvironment(initializeEnvironmentDto);

            const calledWith = configurationDatabaseService.createRecord.mock.calls[0][0];
            expect(calledWith).toBeInstanceOf(ConfigurationDto);
            expect(calledWith.configurationName).toBe('DEFAULT_SENDER_EMAIL');
            expect(calledWith.configurationValue).toBe('structure@test.com');
        });

        it('should handle empty email gracefully', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: ''
            };

            const mockConfigDto = new ConfigurationDto();
            mockConfigDto.configurationName = 'DEFAULT_SENDER_EMAIL';
            mockConfigDto.configurationValue = '';
            
            configurationDatabaseService.createRecord.mockResolvedValue(mockConfigDto);

            await service.initializeEnvironment(initializeEnvironmentDto);

            expect(configurationDatabaseService.createRecord).toHaveBeenCalledWith(
                expect.objectContaining({
                    configurationName: 'DEFAULT_SENDER_EMAIL',
                    configurationValue: ''
                })
            );
        });

        it('should handle database timeout errors', async () => {
            const initializeEnvironmentDto: InitializeEnvironmentDto = {
                defaultSenderEmail: 'timeout@test.com'
            };

            const timeoutError = new Error('Connection timeout');
            timeoutError.name = 'TimeoutError';
            configurationDatabaseService.createRecord.mockRejectedValue(timeoutError);

            const consoleSpy = jest.spyOn(console, 'error');

            await service.initializeEnvironment(initializeEnvironmentDto);

            expect(consoleSpy).toHaveBeenCalledWith('Failed to create configuration record:', timeoutError);
        });
    });
});

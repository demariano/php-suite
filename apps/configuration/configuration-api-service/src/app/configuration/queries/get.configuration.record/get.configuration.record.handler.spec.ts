import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, ResponseDto } from '@dto';
import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetConfigurationRecordHandler } from './get.configuration.record.handler';
import { GetByConfigurationRecordQuery } from './getconfiguration.record';

describe('GetConfigurationRecordHandler', () => {
    let handler: GetConfigurationRecordHandler;
    let mockConfigurationDatabaseService: jest.Mocked<ConfigurationDatabaseServiceAbstract>;

    const mockConfigurationDto: ConfigurationDto = {
        configurationId: '123',
        configurationName: 'test-config',
        configurationValue: 'test-value',
    };

    beforeEach(async () => {
        const mockDatabaseService = {
            findRecordByName: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetConfigurationRecordHandler,
                {
                    provide: 'ConfigurationDatabaseService',
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();

        handler = module.get<GetConfigurationRecordHandler>(GetConfigurationRecordHandler);
        mockConfigurationDatabaseService = module.get('ConfigurationDatabaseService');

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should successfully return configuration when record exists', async () => {
            // Arrange
            const query = new GetByConfigurationRecordQuery('test-config');
            mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockConfigurationDto);

            // Act
            const result = await handler.execute(query);

            // Assert
            expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('test-config');
            expect(result).toBeInstanceOf(ResponseDto);
            expect(result.body).toEqual(mockConfigurationDto);
            expect(result.statusCode).toBe(200);
        });

        it('should throw NotFoundException when configuration record does not exist', async () => {
            // Arrange
            const query = new GetByConfigurationRecordQuery('non-existent-config');
            mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(null);

            // Act & Assert
            await expect(handler.execute(query)).rejects.toThrow(
                'Configuration record not found for name: non-existent-config'
            );
            expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('non-existent-config');
        });

        it('should throw NotFoundException when database service throws error', async () => {
            // Arrange
            const query = new GetByConfigurationRecordQuery('test-config');
            const databaseError = new Error('Database connection failed');
            mockConfigurationDatabaseService.findRecordByName.mockRejectedValue(databaseError);

            // Act & Assert
            await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
            expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('test-config');
        });

        it('should log execution message', async () => {
            // Arrange
            const query = new GetByConfigurationRecordQuery('test-config');
            const logSpy = jest.spyOn(Logger.prototype, 'log');
            mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockConfigurationDto);

            // Act
            await handler.execute(query);

            // Assert
            expect(logSpy).toHaveBeenCalledWith('Configuration retrieval request for: test-config');
        });

        it('should log error message when exception occurs', async () => {
            // Arrange
            const query = new GetByConfigurationRecordQuery('test-config');
            const errorSpy = jest.spyOn(Logger.prototype, 'error');
            const databaseError = new Error('Database connection failed');
            mockConfigurationDatabaseService.findRecordByName.mockRejectedValue(databaseError);

            // Act & Assert
            try {
                await handler.execute(query);
            } catch (error) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                'Configuration retrieval failed for test-config: Database connection failed'
            );
        });

        it('should handle configuration name with special characters', async () => {
            // Arrange
            const specialConfigName = 'test-config_with.special-chars';
            const query = new GetByConfigurationRecordQuery(specialConfigName);
            mockConfigurationDatabaseService.findRecordByName.mockResolvedValue({
                ...mockConfigurationDto,
                configurationName: specialConfigName,
            });

            // Act
            const result = await handler.execute(query);

            // Assert
            expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith(specialConfigName);
            expect(result.body.configurationName).toBe(specialConfigName);
        });
    });
});

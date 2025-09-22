import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, ErrorResponseDto, ResponseDto, UpdateConfigurationDto } from '@dto';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateConfigurationCommand } from './update.configuration.command';
import { UpdateConfigurationHandler } from './update.configuration.handler';

describe('UpdateConfigurationHandler', () => {
  let handler: UpdateConfigurationHandler;
  let mockConfigurationDatabaseService: jest.Mocked<ConfigurationDatabaseServiceAbstract>;

  const mockConfigurationDto: UpdateConfigurationDto = {
    configurationName: 'test-config',
    configurationValue: 'test-value'
  };

  const mockExistingConfig: ConfigurationDto = {
    configurationId: '123',
    configurationName: 'test-config',
    configurationValue: 'old-value'
  };

  const mockUpdatedConfig: ConfigurationDto = {
    ...mockExistingConfig,
    ...mockConfigurationDto
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      findRecordByName: jest.fn(),
      updateRecord: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateConfigurationHandler,
        {
          provide: 'ConfigurationDatabaseService',
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    handler = module.get<UpdateConfigurationHandler>(UpdateConfigurationHandler);
    mockConfigurationDatabaseService = module.get('ConfigurationDatabaseService');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully update configuration when record exists', async () => {
      // Arrange
      const command = new UpdateConfigurationCommand(mockConfigurationDto);
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockExistingConfig);
      mockConfigurationDatabaseService.updateRecord.mockResolvedValue(mockUpdatedConfig);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('test-config');
      expect(mockConfigurationDatabaseService.updateRecord).toHaveBeenCalledWith({
        ...mockExistingConfig,
        ...mockConfigurationDto
      });
      expect(result).toBeInstanceOf(ResponseDto);
      expect(result.body).toEqual(mockUpdatedConfig);
      expect(result.statusCode).toBe(200);
    });

    it('should throw BadRequestException when configuration record does not exist', async () => {
      // Arrange
      const command = new UpdateConfigurationCommand(mockConfigurationDto);
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('test-config');
      expect(mockConfigurationDatabaseService.updateRecord).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when database service throws error', async () => {
      // Arrange
      const command = new UpdateConfigurationCommand(mockConfigurationDto);
      const databaseError = new Error('Database connection failed');
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockExistingConfig);
      mockConfigurationDatabaseService.updateRecord.mockRejectedValue(databaseError);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      expect(mockConfigurationDatabaseService.findRecordByName).toHaveBeenCalledWith('test-config');
      expect(mockConfigurationDatabaseService.updateRecord).toHaveBeenCalled();
    });

    it('should handle error with response body correctly', async () => {
      // Arrange
      const command = new UpdateConfigurationCommand(mockConfigurationDto);
      const errorWithResponse = {
        response: {
          body: {
            errorMessage: 'Custom error message'
          }
        }
      };
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockExistingConfig);
      mockConfigurationDatabaseService.updateRecord.mockRejectedValue(errorWithResponse);

      // Act & Assert
      try {
        await handler.execute(command);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse() as ResponseDto<ErrorResponseDto>;
        expect(response.body.errorMessage).toBe('Custom error message');
        expect(response.statusCode).toBe(400);
      }
    });

    it('should handle generic error correctly', async () => {
      // Arrange
      const command = new UpdateConfigurationCommand(mockConfigurationDto);
      const genericError = new Error('Generic error message');
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockExistingConfig);
      mockConfigurationDatabaseService.updateRecord.mockRejectedValue(genericError);

      // Act & Assert
      try {
        await handler.execute(command);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse() as ResponseDto<ErrorResponseDto>;
        expect(response.body.errorMessage).toBe('Generic error message');
        expect(response.statusCode).toBe(400);
      }
    });

    it('should merge existing configuration with new data correctly', async () => {
      // Arrange
      const partialUpdateDto: UpdateConfigurationDto = {
        configurationName: 'test-config',
        configurationValue: 'new-value'
      };
      const command = new UpdateConfigurationCommand(partialUpdateDto);
      mockConfigurationDatabaseService.findRecordByName.mockResolvedValue(mockExistingConfig);
      mockConfigurationDatabaseService.updateRecord.mockResolvedValue({
        ...mockExistingConfig,
        configurationValue: 'new-value'
      });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockConfigurationDatabaseService.updateRecord).toHaveBeenCalledWith({
        ...mockExistingConfig,
        configurationName: 'test-config',
        configurationValue: 'new-value'
      });
    });
  });
});

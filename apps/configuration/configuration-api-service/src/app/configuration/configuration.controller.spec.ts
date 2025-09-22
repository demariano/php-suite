import { UpdateConfigurationDto } from '@dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateConfigurationCommand } from './commands/update.configuration/update.configuration.command';
import { ConfigurationController } from './configuration.controller';
import { GetByConfigurationRecordQuery } from './queries/get.configuration.record/getconfiguration.record';

// Mock the guards to avoid dependency issues
jest.mock('@auth-guard-lib', () => ({
  CognitoAuthGuard: jest.fn(() => true),
  ApiKeyHeaderGuard: jest.fn(() => true),
}));

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  const mockUpdateConfigurationDto: UpdateConfigurationDto = {
    configurationName: 'test-config',
    configurationValue: 'test-value'
  };

  const mockQueryResponse = {
    body: {
      configurationId: '123',
      configurationName: 'test-config',
      configurationValue: 'test-value'
    },
    statusCode: 200
  };

  const mockCommandResponse = {
    body: {
      configurationId: '123',
      configurationName: 'test-config',
      configurationValue: 'updated-value'
    },
    statusCode: 200
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    commandBus = module.get(CommandBus) as jest.Mocked<CommandBus>;
    queryBus = module.get(QueryBus) as jest.Mocked<QueryBus>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getByConfigurationType', () => {
    it('should execute query with correct parameters', async () => {
      // Arrange
      const configName = 'test-config';
      queryBus.execute.mockResolvedValue(mockQueryResponse);

      // Act
      const result = await controller.getByConfigurationType(configName);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetByConfigurationRecordQuery)
      );
      const executedQuery = queryBus.execute.mock.calls[0][0] as GetByConfigurationRecordQuery;
      expect(executedQuery.configName).toBe(configName);
      expect(result).toEqual(mockQueryResponse);
    });

    it('should handle query execution with special characters in config name', async () => {
      // Arrange
      const specialConfigName = 'test-config_with.special-chars';
      queryBus.execute.mockResolvedValue(mockQueryResponse);

      // Act
      await controller.getByConfigurationType(specialConfigName);

      // Assert
      const executedQuery = queryBus.execute.mock.calls[0][0] as GetByConfigurationRecordQuery;
      expect(executedQuery.configName).toBe(specialConfigName);
    });

    it('should propagate query bus errors', async () => {
      // Arrange
      const configName = 'test-config';
      const queryError = new Error('Query execution failed');
      queryBus.execute.mockRejectedValue(queryError);

      // Act & Assert
      await expect(controller.getByConfigurationType(configName)).rejects.toThrow('Query execution failed');
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetByConfigurationRecordQuery));
    });
  });

  describe('updateConfiguration', () => {
    it('should execute command with correct parameters', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(mockCommandResponse);

      // Act
      const result = await controller.updateConfiguration(mockUpdateConfigurationDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateConfigurationCommand)
      );
      const executedCommand = commandBus.execute.mock.calls[0][0] as UpdateConfigurationCommand;
      expect(executedCommand.configurationDto).toEqual(mockUpdateConfigurationDto);
      expect(result).toEqual(mockCommandResponse);
    });

    it('should handle partial configuration updates', async () => {
      // Arrange
      const partialDto: UpdateConfigurationDto = {
        configurationName: 'test-config',
        configurationValue: 'new-value'
      };
      commandBus.execute.mockResolvedValue(mockCommandResponse);

      // Act
      await controller.updateConfiguration(partialDto);

      // Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as UpdateConfigurationCommand;
      expect(executedCommand.configurationDto).toEqual(partialDto);
    });

    it('should propagate command bus errors', async () => {
      // Arrange
      const commandError = new Error('Command execution failed');
      commandBus.execute.mockRejectedValue(commandError);

      // Act & Assert
      await expect(controller.updateConfiguration(mockUpdateConfigurationDto)).rejects.toThrow('Command execution failed');
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateConfigurationCommand));
    });
  });

  describe('updateConfigurationViaXApiKey', () => {
    it('should execute command with correct parameters', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(mockCommandResponse);

      // Act
      const result = await controller.updateConfigurationViaXApiKey(mockUpdateConfigurationDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateConfigurationCommand)
      );
      const executedCommand = commandBus.execute.mock.calls[0][0] as UpdateConfigurationCommand;
      expect(executedCommand.configurationDto).toEqual(mockUpdateConfigurationDto);
      expect(result).toEqual(mockCommandResponse);
    });

    it('should use same command as regular update method', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue(mockCommandResponse);

      // Act
      await controller.updateConfiguration(mockUpdateConfigurationDto);
      await controller.updateConfigurationViaXApiKey(mockUpdateConfigurationDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);
      const firstCommand = commandBus.execute.mock.calls[0][0] as UpdateConfigurationCommand;
      const secondCommand = commandBus.execute.mock.calls[1][0] as UpdateConfigurationCommand;
      expect(firstCommand.configurationDto).toEqual(secondCommand.configurationDto);
    });

    it('should handle API key endpoint specific scenarios', async () => {
      // Arrange
      const apiKeyDto: UpdateConfigurationDto = {
        configurationName: 'api-key-config',
        configurationValue: 'api-key-value'
      };
      commandBus.execute.mockResolvedValue(mockCommandResponse);

      // Act
      const result = await controller.updateConfigurationViaXApiKey(apiKeyDto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateConfigurationCommand));
      const executedCommand = commandBus.execute.mock.calls[0][0] as UpdateConfigurationCommand;
      expect(executedCommand.configurationDto).toEqual(apiKeyDto);
      expect(result).toEqual(mockCommandResponse);
    });

    it('should propagate command bus errors for API key endpoint', async () => {
      // Arrange
      const commandError = new Error('API key command execution failed');
      commandBus.execute.mockRejectedValue(commandError);

      // Act & Assert
      await expect(controller.updateConfigurationViaXApiKey(mockUpdateConfigurationDto)).rejects.toThrow('API key command execution failed');
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateConfigurationCommand));
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple concurrent requests', async () => {
      // Arrange
      const config1 = { ...mockUpdateConfigurationDto, configurationName: 'config1' };
      const config2 = { ...mockUpdateConfigurationDto, configurationName: 'config2' };
      commandBus.execute.mockResolvedValue(mockCommandResponse);
      queryBus.execute.mockResolvedValue(mockQueryResponse);

      // Act
      const promises = [
        controller.updateConfiguration(config1),
        controller.updateConfigurationViaXApiKey(config2),
        controller.getByConfigurationType('test-config')
      ];
      await Promise.all(promises);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(2);
      expect(queryBus.execute).toHaveBeenCalledTimes(1);
    });
  });
});

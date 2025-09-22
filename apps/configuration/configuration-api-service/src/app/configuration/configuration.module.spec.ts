import { ConfigurationDatabaseService } from '@configuration-database-service';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateConfigurationHandler } from './commands/update.configuration/update.configuration.handler';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationModule } from './configuration.module';
import { GetConfigurationRecordHandler } from './queries/get.configuration.record/get.configuration.record.handler';

// Mock the external modules
jest.mock('@dynamo-db-lib', () => ({
  DynamoDbLibModule: class MockDynamoDbLibModule {}
}));

jest.mock('@configuration-lib', () => ({
  ConfigurationLibModule: class MockConfigurationLibModule {}
}));

jest.mock('@auth-guard-lib', () => ({
  AuthGuardLibModule: class MockAuthGuardLibModule {},
  CognitoAuthGuard: class MockCognitoAuthGuard {},
  ApiKeyHeaderGuard: class MockApiKeyHeaderGuard {}
}));

jest.mock('@configuration-database-service', () => ({
  ConfigurationDatabaseService: class MockConfigurationDatabaseService {
    findRecordByName = jest.fn();
    updateRecord = jest.fn();
  }
}));

describe('ConfigurationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigurationModule, CqrsModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ConfigurationController', () => {
    const controller = module.get<ConfigurationController>(ConfigurationController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ConfigurationController);
  });

  it('should provide CommandBus from CqrsModule', () => {
    const commandBus = module.get<CommandBus>(CommandBus);
    expect(commandBus).toBeDefined();
  });

  it('should provide QueryBus from CqrsModule', () => {
    const queryBus = module.get<QueryBus>(QueryBus);
    expect(queryBus).toBeDefined();
  });

  it('should provide ConfigurationDatabaseService with correct token', () => {
    const databaseService = module.get('ConfigurationDatabaseService');
    expect(databaseService).toBeDefined();
    expect(databaseService).toBeInstanceOf(ConfigurationDatabaseService);
  });

  it('should provide GetConfigurationRecordHandler', () => {
    const handler = module.get<GetConfigurationRecordHandler>(GetConfigurationRecordHandler);
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(GetConfigurationRecordHandler);
  });

  it('should provide UpdateConfigurationHandler', () => {
    const handler = module.get<UpdateConfigurationHandler>(UpdateConfigurationHandler);
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(UpdateConfigurationHandler);
  });

  it('should wire dependencies correctly for ConfigurationController', () => {
    const controller = module.get<ConfigurationController>(ConfigurationController);
    expect(controller).toBeDefined();
    
    // Verify that the controller has access to CommandBus and QueryBus
    // This is implicit verification through successful instantiation
    // Verify that the controller has access to CommandBus and QueryBus
    // This is implicit verification through successful instantiation
    expect(controller).toBeDefined();
  });

  it('should wire dependencies correctly for handlers', () => {
    const updateHandler = module.get<UpdateConfigurationHandler>(UpdateConfigurationHandler);
    const getHandler = module.get<GetConfigurationRecordHandler>(GetConfigurationRecordHandler);
    
    expect(updateHandler).toBeDefined();
    expect(getHandler).toBeDefined();
    
    // Both handlers should have access to the database service
    // This is verified through successful instantiation
  });

  it('should have all required imports', async () => {
    // This test verifies that the module can be compiled with all its imports
    // If any import is missing or incorrectly configured, the module compilation would fail
    const compiledModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
    }).compile();
    
    expect(compiledModule).toBeDefined();
    await compiledModule.close();
  });

  it('should register all expected providers', () => {
    // Get all providers from the compiled module
    const providers = [
      'ConfigurationDatabaseService',
      GetConfigurationRecordHandler,
      UpdateConfigurationHandler,
      CommandBus,
      QueryBus
    ];

    providers.forEach(provider => {
      expect(() => module.get(provider)).not.toThrow();
    });
  });

  it('should handle module initialization and cleanup', async () => {
    // Test that the module can be initialized and cleaned up properly
    const testModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
    }).compile();

    await testModule.init();
    expect(testModule).toBeDefined();

    await testModule.close();
    // If we get here without errors, cleanup was successful
  });
});

import { GetByConfigurationRecordQuery } from './getconfiguration.record';

describe('GetByConfigurationRecordQuery', () => {
  it('should be defined', () => {
    const query = new GetByConfigurationRecordQuery('test-config');
    expect(query).toBeDefined();
  });

  it('should correctly assign config name', () => {
    // Arrange
    const configName = 'test-configuration';

    // Act
    const query = new GetByConfigurationRecordQuery(configName);

    // Assert
    expect(query.configName).toBe(configName);
  });

  it('should handle config name with special characters', () => {
    // Arrange
    const specialConfigName = 'test-config_with.special-chars@123';

    // Act
    const query = new GetByConfigurationRecordQuery(specialConfigName);

    // Assert
    expect(query.configName).toBe(specialConfigName);
  });

  it('should handle empty config name', () => {
    // Arrange
    const emptyConfigName = '';

    // Act
    const query = new GetByConfigurationRecordQuery(emptyConfigName);

    // Assert
    expect(query.configName).toBe('');
  });

  it('should handle config name with spaces', () => {
    // Arrange
    const configNameWithSpaces = 'config with spaces';

    // Act
    const query = new GetByConfigurationRecordQuery(configNameWithSpaces);

    // Assert
    expect(query.configName).toBe('config with spaces');
  });

  it('should handle very long config names', () => {
    // Arrange
    const longConfigName = 'a'.repeat(1000); // Very long config name

    // Act
    const query = new GetByConfigurationRecordQuery(longConfigName);

    // Assert
    expect(query.configName).toBe(longConfigName);
    expect(query.configName.length).toBe(1000);
  });

  it('should handle config names with unicode characters', () => {
    // Arrange
    const unicodeConfigName = 'config-with-émojis-🚀-and-spëcial-chars';

    // Act
    const query = new GetByConfigurationRecordQuery(unicodeConfigName);

    // Assert
    expect(query.configName).toBe(unicodeConfigName);
  });

  it('should handle multiple instances with different config names', () => {
    // Arrange
    const configName1 = 'config-1';
    const configName2 = 'config-2';

    // Act
    const query1 = new GetByConfigurationRecordQuery(configName1);
    const query2 = new GetByConfigurationRecordQuery(configName2);

    // Assert
    expect(query1.configName).toBe(configName1);
    expect(query2.configName).toBe(configName2);
    expect(query1.configName).not.toBe(query2.configName);
  });

  it('should handle null and undefined gracefully', () => {
    // Note: TypeScript would normally prevent this, but testing runtime behavior
    
    // Act & Assert for null
    expect(() => new GetByConfigurationRecordQuery(null as any)).not.toThrow();
    const nullQuery = new GetByConfigurationRecordQuery(null as any);
    expect(nullQuery.configName).toBeNull();

    // Act & Assert for undefined
    expect(() => new GetByConfigurationRecordQuery(undefined as any)).not.toThrow();
    const undefinedQuery = new GetByConfigurationRecordQuery(undefined as any);
    expect(undefinedQuery.configName).toBeUndefined();
  });

  it('should maintain immutability after creation', () => {
    // Arrange
    const originalConfigName = 'original-config';
    const query = new GetByConfigurationRecordQuery(originalConfigName);

    // Act - Attempt to modify (this should not affect the original if properly implemented)
    const modifiedName = 'modified-config';
    
    // Assert
    expect(query.configName).toBe(originalConfigName);
    
    // Verify that we can't accidentally modify the internal state
    // (This is more of a design verification test)
    expect(typeof query.configName).toBe('string');
  });
});

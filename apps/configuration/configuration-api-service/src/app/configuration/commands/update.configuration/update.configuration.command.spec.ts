import { UpdateConfigurationDto } from '@dto';
import { UpdateConfigurationCommand } from './update.configuration.command';

describe('UpdateConfigurationCommand', () => {
  const mockConfigurationDto: UpdateConfigurationDto = {
    configurationName: 'test-config',
    configurationValue: 'test-value'
  };

  it('should be defined', () => {
    const command = new UpdateConfigurationCommand(mockConfigurationDto);
    expect(command).toBeDefined();
  });

  it('should correctly assign configuration DTO', () => {
    // Act
    const command = new UpdateConfigurationCommand(mockConfigurationDto);

    // Assert
    expect(command.configurationDto).toEqual(mockConfigurationDto);
    expect(command.configurationDto.configurationName).toBe('test-config');
    expect(command.configurationDto.configurationValue).toBe('test-value');
  });

  it('should handle partial configuration DTO', () => {
    // Arrange
    const partialDto: UpdateConfigurationDto = {
      configurationName: 'partial-config',
      configurationValue: 'partial-value'
    };

    // Act
    const command = new UpdateConfigurationCommand(partialDto);

    // Assert
    expect(command.configurationDto).toEqual(partialDto);
    expect(command.configurationDto.configurationName).toBe('partial-config');
    expect(command.configurationDto.configurationValue).toBe('partial-value');
  });

  it('should handle configuration DTO with empty values', () => {
    // Arrange
    const emptyDto: UpdateConfigurationDto = {
      configurationName: '',
      configurationValue: ''
    };

    // Act
    const command = new UpdateConfigurationCommand(emptyDto);

    // Assert
    expect(command.configurationDto).toEqual(emptyDto);
    expect(command.configurationDto.configurationName).toBe('');
    expect(command.configurationDto.configurationValue).toBe('');
  });

  it('should handle configuration DTO with special characters', () => {
    // Arrange
    const specialCharDto: UpdateConfigurationDto = {
      configurationName: 'test-config_with.special-chars@123',
      configurationValue: 'value-with-special!@#$%^&*()chars'
    };

    // Act
    const command = new UpdateConfigurationCommand(specialCharDto);

    // Assert
    expect(command.configurationDto).toEqual(specialCharDto);
    expect(command.configurationDto.configurationName).toBe('test-config_with.special-chars@123');
    expect(command.configurationDto.configurationValue).toBe('value-with-special!@#$%^&*()chars');
  });

  it('should maintain object reference integrity', () => {
    // Arrange
    const originalDto = { ...mockConfigurationDto };

    // Act
    const command = new UpdateConfigurationCommand(mockConfigurationDto);
    
    // Modify the original DTO to ensure the command maintains its own reference
    mockConfigurationDto.configurationValue = 'modified-value';

    // Assert
    expect(command.configurationDto.configurationValue).toBe('modified-value');
    // This test demonstrates that the command holds a reference to the original object
    // In a real scenario, you might want to create a deep copy to avoid this
  });

  it('should handle null and undefined gracefully', () => {
    // Note: TypeScript would normally prevent this, but testing runtime behavior
    
    // Act & Assert for null
    expect(() => new UpdateConfigurationCommand(null as any)).not.toThrow();
    const nullCommand = new UpdateConfigurationCommand(null as any);
    expect(nullCommand.configurationDto).toBeNull();

    // Act & Assert for undefined
    expect(() => new UpdateConfigurationCommand(undefined as any)).not.toThrow();
    const undefinedCommand = new UpdateConfigurationCommand(undefined as any);
    expect(undefinedCommand.configurationDto).toBeUndefined();
  });
});

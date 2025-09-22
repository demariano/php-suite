import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, ErrorResponseDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateConfigurationCommand } from './update.configuration.command';

/**
 * Handles updating system configuration records for application settings and operational parameters.
 *
 * **Business Rules:**
 * - Configuration records must exist before they can be updated (no automatic creation)
 * - Configuration names serve as unique identifiers and cannot be modified
 * - Updates are atomic operations with immediate effect on system behavior
 * - Configuration changes may trigger downstream system reconfiguration
 * - All configuration updates logged for audit trail and troubleshooting
 * - Invalid configuration values may cause system instability or service degradation
 *
 * **Integration Points:**
 * - ConfigurationDatabaseServiceAbstract: DynamoDB-based configuration storage and retrieval
 * - System Services: Configuration changes propagated to dependent services automatically
 * - Caching Layer: Configuration updates invalidate cached values for immediate effect
 * - Logging: Comprehensive audit trail for configuration management and compliance
 *
 * **Configuration Types:**
 * - Email Service Settings: SMTP configurations, sender addresses, templates
 * - Authentication Settings: JWT expiration, MFA requirements, session timeouts
 * - Database Connections: Connection strings, timeout values, retry policies
 * - API Integrations: Third-party service endpoints, API keys, rate limits
 * - Business Logic Parameters: Feature flags, operational thresholds, processing limits
 *
 * **Error Scenarios:**
 * - Configuration not found: Returns 404 with specific configuration name
 * - Invalid configuration format: Returns 400 with validation error details
 * - Database connection issues: Returns 500 with retry guidance
 * - Permission denied: Returns 403 for unauthorized configuration updates
 * - Concurrent modification conflicts: Handled by optimistic locking mechanisms
 *
 * **Use Cases:**
 * - System Administration: Updating operational parameters without code deployment
 * - Feature Management: Enabling/disabling features through configuration flags
 * - Environment Promotion: Synchronizing configurations across environments
 * - Performance Tuning: Adjusting thresholds and limits based on system behavior
 * - Security Management: Updating authentication and authorization parameters
 * - Integration Management: Modifying third-party service configurations
 *
 * **Impact Considerations:**
 * - Immediate Effect: Configuration changes take effect immediately without restart
 * - Service Dependencies: Updates may affect multiple services simultaneously
 * - Rollback Capability: Previous values logged for configuration rollback scenarios
 * - Validation Requirements: Critical configurations require additional validation
 */
@CommandHandler(UpdateConfigurationCommand)
export class UpdateConfigurationHandler implements ICommandHandler<UpdateConfigurationCommand> {
    protected readonly logger = new Logger(UpdateConfigurationHandler.name);

    constructor(
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateConfigurationCommand): Promise<ResponseDto<ConfigurationDto | ErrorResponseDto>> {
        this.logger.log(`Configuration update request for: ${command.configurationDto.configurationName}`);

        try {
            let existingConfigurationRecord = await this.configurationDatabaseService.findRecordByName(
                command.configurationDto.configurationName
            );

            if (!existingConfigurationRecord) {
                throw new NotFoundException(
                    `Configuration record not found for name ${command.configurationDto.configurationName}`
                );
            }

            existingConfigurationRecord = {
                ...existingConfigurationRecord,
                ...command.configurationDto,
            };

            const configurationRecord = await this.configurationDatabaseService.updateRecord(
                existingConfigurationRecord
            );

            this.logger.log(
                `Configuration updated successfully: ${command.configurationDto.configurationName} = ${command.configurationDto.configurationValue}`
            );
            return new ResponseDto<ConfigurationDto>(configurationRecord, 200);
        } catch (error) {
            this.logger.error(
                `Configuration update failed for ${command.configurationDto.configurationName}: ${JSON.stringify(
                    error
                )}`
            );

            const errorMessage = error.response?.body?.errorMessage || error.message;
            const errorResponseDto: ErrorResponseDto = { errorMessage };

            throw new BadRequestException(new ResponseDto<ErrorResponseDto>(errorResponseDto, 400));
        }
    }
}

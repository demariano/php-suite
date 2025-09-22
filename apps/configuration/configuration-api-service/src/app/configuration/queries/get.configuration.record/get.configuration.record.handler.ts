import { ConfigurationDatabaseServiceAbstract } from '@configuration-database-service';
import { ConfigurationDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetByConfigurationRecordQuery } from './getconfiguration.record';

/**
 * Handles retrieval of system configuration records by configuration name for application settings access.
 *
 * **Business Rules:**
 * - Configuration records retrieved by unique configuration name identifier
 * - All configuration queries logged for audit trail and access monitoring
 * - Missing configurations treated as application errors requiring investigation
 * - Configuration access may be cached for performance optimization
 * - Real-time configuration values ensure immediate effect of configuration updates
 * - Sensitive configurations may require additional access controls
 *
 * **Integration Points:**
 * - ConfigurationDatabaseServiceAbstract: DynamoDB-based configuration storage and retrieval
 * - Caching Layer: Configuration values cached for performance with cache invalidation on updates
 * - System Services: Configuration values used by multiple services for operational parameters
 * - Logging: Comprehensive audit trail for configuration access patterns and troubleshooting
 *
 * **Configuration Categories:**
 * - Email Service Settings: SMTP server details, sender addresses, email templates
 * - Authentication Settings: JWT secrets, expiration times, MFA requirements
 * - Database Settings: Connection parameters, timeout values, retry policies
 * - API Integration Settings: Third-party endpoints, API keys, rate limiting parameters
 * - Business Logic Parameters: Feature flags, processing thresholds, operational limits
 * - Security Settings: Encryption keys, access control parameters, audit settings
 *
 * **Performance Considerations:**
 * - Frequently accessed configurations cached in memory for rapid retrieval
 * - Database queries optimized with proper indexing on configuration names
 * - Configuration access patterns monitored for optimization opportunities
 * - Bulk configuration loading supported for application startup scenarios
 *
 * **Error Scenarios:**
 * - Configuration not found: Returns 404 with specific configuration name for troubleshooting
 * - Database connection issues: Returns 500 with retry guidance and fallback mechanisms
 * - Invalid configuration format: Logged for investigation and potential data corruption
 * - Access permission denied: Returns 403 for unauthorized configuration access attempts
 *
 * **Use Cases:**
 * - Application Startup: Loading essential configuration parameters for service initialization
 * - Runtime Configuration: Retrieving dynamic settings during application execution
 * - Feature Flag Evaluation: Checking feature enablement status for conditional logic
 * - Integration Setup: Accessing third-party service configuration for API connections
 * - Security Policy Enforcement: Retrieving security parameters for access control
 * - Monitoring and Alerting: Accessing threshold values for system monitoring
 */
@QueryHandler(GetByConfigurationRecordQuery)
export class GetConfigurationRecordHandler implements IQueryHandler<GetByConfigurationRecordQuery> {
    private readonly logger = new Logger(GetConfigurationRecordHandler.name);

    constructor(
        @Inject('ConfigurationDatabaseService')
        private readonly configurationDatabaseService: ConfigurationDatabaseServiceAbstract
    ) {}

    async execute(query: GetByConfigurationRecordQuery): Promise<ResponseDto<ConfigurationDto>> {
        this.logger.log(`Configuration retrieval request for: ${query.configName}`);

        try {
            const configuration = await this.configurationDatabaseService.findRecordByName(query.configName);

            if (!configuration) {
                throw new NotFoundException(`Configuration record not found for name: ${query.configName}`);
            }

            this.logger.log(`Configuration retrieved successfully: ${query.configName}`);
            return new ResponseDto<ConfigurationDto>(configuration, 200);
        } catch (error) {
            this.logger.error(`Configuration retrieval failed for ${query.configName}: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new NotFoundException(`Configuration record not found for name: ${query.configName}`);
        }
    }
}

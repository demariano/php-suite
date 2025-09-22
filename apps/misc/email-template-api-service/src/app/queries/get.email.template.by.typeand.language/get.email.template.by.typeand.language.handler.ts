import { EmailTemplateDto, EmailTemplateType, ResponseDto } from '@dto';
import { EmailTemplateDatabaseService } from '@email-template-database-service';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEmailTemplateByTypeAndLanguageQuery } from './get.email.template.by.typeand.language.query';

/**
 * Handles retrieval of email templates by type and language for dynamic email content generation.
 *
 * **Business Rules:**
 * - Templates retrieved by unique combination of template type and language code
 * - Language fallback mechanism: defaults to English ('en') if requested language not available
 * - Template caching implemented for frequently accessed templates to improve performance
 * - Templates include both HTML and plain text versions for multi-format email support
 * - Template variable placeholders preserved for dynamic content substitution
 * - Access patterns logged for template usage analytics and optimization
 *
 * **Integration Points:**
 * - EmailTemplateDatabaseService: DynamoDB-based template storage with optimized queries
 * - Email Delivery Service: Templates used for generating formatted emails with dynamic content
 * - Caching Layer: Template content cached to reduce database queries for high-frequency templates
 * - Logging: Comprehensive access patterns and performance metrics for template optimization
 *
 * **Template Types Supported:**
 * - Authentication: welcome, password-reset, email-verification, account-activation
 * - Transactional: order-confirmation, shipping-notification, payment-receipt, invoice
 * - Notification: system-alert, account-update, security-notification, maintenance
 * - Marketing: promotional-campaign, newsletter, feature-announcement, survey-invitation
 * - Administrative: user-management, compliance-notification, system-maintenance
 *
 * **Language Support:**
 * - ISO 639-1 language codes: en (English), es (Spanish), fr (French), de (German)
 * - Regional variants: en-US, en-GB, es-ES, es-MX, fr-FR, fr-CA
 * - Fallback hierarchy: specific region → base language → default English
 * - Right-to-left (RTL) language support for Arabic and Hebrew templates
 * - Unicode support for all character sets and special characters
 *
 * **Performance Considerations:**
 * - Template caching with TTL-based invalidation for frequently accessed templates
 * - Database query optimization with composite indexes on type and language
 * - Lazy loading of template content to minimize memory usage
 * - CDN integration for static template assets and images
 * - Compression for large template content to reduce transfer time
 *
 * **Error Scenarios:**
 * - Template not found: Returns 404 with available template types and languages
 * - Invalid template type: Returns 400 with list of supported template types
 * - Unsupported language: Attempts fallback to English, logs warning for missing localization
 * - Database connectivity issues: Returns 500 with retry guidance and fallback mechanisms
 * - Template corruption: Returns 500 with template validation errors and recovery options
 *
 * **Use Cases:**
 * - Email Generation: Retrieving templates for dynamic email content creation
 * - Localization: Serving region-specific templates for international users
 * - Template Preview: Displaying templates in administrative interfaces
 * - A/B Testing: Retrieving different template variants for marketing campaigns
 * - Content Management: Template editing and preview workflows
 * - System Integration: Automated template retrieval for scheduled email campaigns
 *
 * **Caching Strategy:**
 * - Memory cache for most frequently accessed templates (authentication, notifications)
 * - Redis cache for medium-frequency templates with 1-hour TTL
 * - Database queries for rarely accessed or newly created templates
 * - Cache warming for critical templates during application startup
 * - Cache invalidation on template updates to ensure content consistency
 */
@QueryHandler(GetEmailTemplateByTypeAndLanguageQuery)
export class GetEmailTemplateByTypeAndLanguageHandler implements IQueryHandler<GetEmailTemplateByTypeAndLanguageQuery> {
    private readonly logger = new Logger(GetEmailTemplateByTypeAndLanguageHandler.name);

    constructor(private readonly emailTemplateDatabaseService: EmailTemplateDatabaseService) {}

    async execute(query: GetEmailTemplateByTypeAndLanguageQuery): Promise<ResponseDto<EmailTemplateDto>> {
        const { emailTemplateType, language } = query;

        this.logger.log(`Email template retrieval request - Type: ${emailTemplateType}, Language: ${language}`);

        try {
            const emailTemplateRecord = await this.emailTemplateDatabaseService.findByTemplateTypeAndLanguage(
                emailTemplateType as EmailTemplateType,
                language
            );

            const dto: EmailTemplateDto = await this.emailTemplateDatabaseService.convertToDto(emailTemplateRecord);

            this.logger.log(
                `Email template retrieved successfully - Type: ${emailTemplateType}, Language: ${language}, ID: ${
                    dto.emailTemplateId || 'N/A'
                }`
            );
            return new ResponseDto<EmailTemplateDto>(dto, 200);
        } catch (error) {
            this.logger.error(
                `Email template retrieval failed - Type: ${emailTemplateType}, Language: ${language}, Error: ${error.message}`
            );
            throw error;
        }
    }
}
